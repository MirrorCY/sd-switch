import { Context, Logger, Schema, trimSlash } from 'koishi'

export const name = 'sd-switch'

export interface Config {
  endpoint?: string
  inputTimeout?: number
  vaeList?: Array<string>
}

export const Config: Schema<Config> = Schema.object({
  endpoint: Schema.string().description('SD-WebUI 服务器地址。').default('http://127.0.0.1:7860'),
  inputTimeout: Schema.number().description('选择模型的等待时间').default(10000),
  vaeList: Schema.array(
    Schema.string()
  ).description('vae 列表，请输入去掉结尾 .pt 后的 vae 文件名。')
})

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
        session.send(
          `当前模型为：${model}\n` +
          `当前 VAE 为：${vae}\n` +
          `输入 1 切换模型，输入 2 切换 VAE：`
        )
      }

      async function sendModels() {
        await getModelList()
        session.send('当前可用模型有：\n' +
          models.map((model, i) => `${i + 1}.${model}\n`).join('') +
          '\n回复模型序号切换模型')
      }

      async function sendVaes() {
        await getModelList()
        session.send('当前可用 VAE 有：\n' +
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
        session.send(`已切换至模型：${model}`)
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
        session.send(`已切换至 VAE：${vae}`)
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


