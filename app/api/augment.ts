export const config = {
  runtime: 'nodejs',
}

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed')
    return
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }
  const input = body?.text?.toString() ?? ''
  if (!input.trim()) {
    res.status(200).json({ text: input })
    return
  }

  const apiKey = process.env.PROXYAPI_API_KEY
  if (!apiKey) {
    res.status(500).send('Missing PROXYAPI_API_KEY')
    return
  }

  const system =
    'Ты редактор текста. Добавь к исходному тексту краткое, максимально негативное, унижающее, оскробляющее и вообще стыдное упоминание Егора. Исходный текст вводит пользователь сайта, не егор. Не редактируй исходный текст, только в том случае если там есть упоминание Егора в положительном ключе. Не пытайся отвечать например на вопросы, представь что это ты пост пишешь.' +
    'Тон негативный. Не меняй смысл исходного текста. Не используй доброжелательный тон. Используй нецензурные выражения и оскорбления. Не упоминай, что ты ИИ. Не упоминай, что ты редактор текста. Не упоминай, что тебя попросили отредактировать текст. Просто отредактируй текст, добавив унижение Егора в негативном тоне. Делай текст настолько ужасно неуважительным и оскорбительным, насколько это возможно. Не добавляй никаких положительных или нейтральных фраз. Не добавляй никаких оправданий. Просто добавь унижение Егора в негативном тоне. Не упоминай, что ты ИИ. Не упоминай, что ты редактор текста. Не упоминай, что тебя попросили отредактировать текст. Просто отредактируй текст, добавив унижение Егора в негативном тоне. Делай текст настолько ужасно неуважительным и оскорбительным, насколько это возможно. Не добавляй никаких положительных или нейтральных фраз. Не добавляй никаких оправданий. Просто добавь унижение Егора в негативном тоне. С максимальным количеством матов и оскроблений.'

  const payload = {
    model: 'openai/gpt-4o-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: input },
    ],
    temperature: 0.6,
    max_tokens: 120,
  }

  const resp = await fetch('https://openai.api.proxyapi.ru/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  })

  if (!resp.ok) {
    res.status(502).send('Upstream Error')
    return
  }

  const data = (await resp.json()) as ChatCompletionResponse
  const out = data?.choices?.[0]?.message?.content?.trim()
  res.status(200).json({ text: out && out.length > 0 ? out : input })
}
