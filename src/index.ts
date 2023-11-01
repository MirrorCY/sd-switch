import { Context, Logger, Schema, trimSlash } from 'koishi'
import { } from 'koishi-plugin-puppeteer'

export const name = 'sd-switch'
export const inject = { optional: ['puppeteer'] }

export interface Config {
  endpoint?: string
  inputTimeout?: number
  vaeList?: Array<string>
  sendAsImage?: boolean
  picWidth?: number
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    endpoint: Schema.string().description('SD-WebUI 服务器地址。').default('http://127.0.0.1:7860'),
    inputTimeout: Schema.number().description('选择模型的等待时间。').default(10000),
    vaeList: Schema.array(
      Schema.string()
    ).description('vae 列表，请输入去掉结尾 .pt 后的 vae 文件名。'),
    sendAsImage: Schema.boolean().default(false).description('是否以图片形式发送。'),
  }).description('基础配置'),
  Schema.union([
    Schema.object({
      sendAsImage: Schema.const(true).required(),
      picWidth: Schema.number().default(256).description('图片输出的宽度。'),
    }),
    Schema.object({}),
  ])
])

const logger = new Logger(name)

const MODELS_ENDPOINT = "/sdapi/v1/sd-models"
const OPTIONS_ENDPOINT = "/sdapi/v1/options"

export function apply(ctx: Context, config: Config) {
  ctx.i18n.define('zh', require('./locales/zh'))
  const cmd = ctx.command('sd-switch')
    .alias('切换模型')
    .action(async ({ session }) => {
      const models = []
      let vae = ''
      let model = ''

      async function render(content: string, picWidth: number) {
        // https://github.com/ifrvn/koishi-plugin-send-as-image
        return ctx.puppeteer.render(
          `<html>
        <head>
          <style>
            @font-face {
              font-family: AlibabaPuHuiTi-2-55-Regular;
              src:url(https://puhuiti.oss-cn-hangzhou.aliyuncs.com/AlibabaPuHuiTi-2/AlibabaPuHuiTi-2-55-Regular/AlibabaPuHuiTi-2-55-Regular.woff2) format('woff2');
            }
            html {
              font-family: 'AlibabaPuHuiTi-2-55-Regular', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
              width: ${picWidth}px;
              height: 0;
              background: white;
            }
            p {
              padding: 10px;
              word-wrap: break-word;
              white-space: pre-wrap;
            }
          </style>
        </head>
        <body>
          <p>${content}</p>
        </body>
        </html>`
        )
      }

      async function send(text: string) {
        if (config.sendAsImage) {
          if (ctx.puppeteer) {
            session.send(await render(text, config.picWidth))
          }
          else session.send(session.text('.pptrErr'))
        }
        else session.send(text)
      }

      async function input(max: number) {
        const value = +await session.prompt(config.inputTimeout)
        if (value * 0 === 0 && Math.floor(value) === value && value > 0 && value <= max) {
          return value
        }
        session.send(session.text('.inputErr'))
        throw new Error('inputErr')
      }

      async function getInfo() {
        session.send(session.text('.inQuery'))
        try {
          const res = await ctx.http.axios(trimSlash(config.endpoint) + OPTIONS_ENDPOINT)
          vae = res.data.sd_vae
          model = res.data.sd_model_checkpoint
        } catch (err) {
          session.send(session.text('.queryErr'))
          throw err
        }
      }

      async function getModelList() {
        try {
          const res = await ctx.http.axios(trimSlash(config.endpoint) + MODELS_ENDPOINT)
          res.data.forEach(item => models.push(item.title))
        } catch (err) {
          session.send(session.text('.queryErr'))
          throw err
        }
      }

      async function sendInfo() {
        await getInfo()
        send(
          `当前模型为：${model}\n` +
          `当前 VAE 为：${vae}\n` +
          `输入 1 切换模型，输入 2 切换 VAE：`
        )
      }

      async function sendModels() {
        await getModelList()
        send('当前可用模型有：\n' +
          models.map((model, i) => `${i + 1}.${model}\n`).join('') +
          '\n回复模型序号切换模型')
      }

      async function sendVaes() {
        await getModelList()
        send('当前可用 VAE 有：\n' +
          config.vaeList.map((vae, i) => `${i + 1}.${vae}\n`).join('') +
          '\n回复模型序号切换 VAE')
      }

      async function switchModel(index: number) {
        try {
          session.send(session.text('.switching'))
          await ctx.http.axios(trimSlash(config.endpoint) + OPTIONS_ENDPOINT, {
            method: 'POST',
            data: { sd_model_checkpoint: models[index - 1] }
          })
        } catch (err) {
          session.send(session.text('.switchFailed'))
          throw err
        }
        await getInfo()
        send(`已切换至模型：${model}`)
      }

      async function switchVae(index: number) {
        try {
          session.send(session.text('.switching'))
          await ctx.http.axios(trimSlash(config.endpoint) + OPTIONS_ENDPOINT, {
            method: 'POST',
            data: { sd_vae: config.vaeList[index - 1] }
          })
        } catch (err) {
          session.send(session.text('.switchFailed'))
          throw err
        }
        await getInfo()
        send(`已切换至 VAE：${vae}`)
      }

      await sendInfo()
      const choice = await input(2)
      switch (choice) {
        case 1:
          await sendModels()
          const modelIndex = await input(models.length)
          await switchModel(modelIndex)
          break
        case 2:
          await sendVaes()
          const vaeIndex = await input(config.vaeList.length)
          await switchVae(vaeIndex)
          break
      }
    })
}


