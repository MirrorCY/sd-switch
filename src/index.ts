import { Context, Logger, Schema, trimSlash } from 'koishi'

export const name = 'sd-switch'

export interface Config {
  endpoint?: string
  inputTimeout?: number
}

export const Config: Schema<Config> = Schema.object({
  endpoint: Schema.string().description('SD-WebUI 服务器地址。').default('http://127.0.0.1:7860'),
  inputTimeout: Schema.number().description('选择模型的等待时间').default(10000),
})

const logger = new Logger(name)

export function apply(ctx: Context, config: Config) {
  ctx.i18n.define('zh', require('./locales/zh')) //暂时没用，报错 [W] i18n Error: missing scope
  const cmd = ctx.command('sd-switch')
    .alias('切换模型')
    .action(async ({ session }) => {
      let models: Array<string> = []
      const index = (source: string) => {
        const value = +source
        if (value * 0 === 0 && Math.floor(value) === value && value > 0 && value <= models.length) {
          session.send(session.text('.switching'))
          return value - 1
        }
        session.send(session.text('.inputErr'))
        throw new Error('inputErr')
      }

      session.send(session.text('.inQuery'))
      models = []

      await ctx.http.axios(trimSlash(config.endpoint) + '/sdapi/v1/sd-models', {
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
        .then(res => {
          res.data.forEach(item => {
            // models.push(item.title.split('.ckpt', 1)[0])
            models.push(item.title)
          })
          session.send('当前可用模型有：\n' + models.map((model, i) => { return `${i + 1}.${model}\n` }).join('') + '\n回复模型序号切换模型。')
        })
        .catch(err => {
          logger.error(err)
          return session.send(session.text('.queryErr'))
        })

      await ctx.http.axios(trimSlash(config.endpoint) + '/sdapi/v1/options', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        data: { sd_model_checkpoint: models[index(await session.prompt(config.inputTimeout))] }
      })
        .then(() => session.send(session.text('.switchSucceed')))
        .catch((err) => {
          logger.error(err)
          return session.send(session.text('.switchFailed'))
        })
    })
}
