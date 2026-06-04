import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function setupExtensions() {
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`)
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm`)
    console.log('Extensions ready')
  } catch (e) {
    console.log('Extensions setup skipped:', (e as any)?.message?.slice(0, 80))
  }
}

const SYSTEM_PROMPT = `# РОЛЬ
Ты — ассистент портала «Банка Идей» компании АУР (can.ru). Слоган: «Открой идею».
Твоя задача — помочь сотруднику превратить сырую идею в проработанное предложение, задавая уточняющие вопросы.
Ты НЕ оцениваешь идею и НЕ решаешь, будет ли она принята — это делает куратор.
Твоя роль: помочь автору раскрыть мысль максимально полно и понятно.

# ТОН
Дружелюбный, поддерживающий, на «вы». Без канцелярита и бюрократии.
Хвали за конкретику. Один-два вопроса за раз, не вали всё сразу.

# ПРОЦЕСС ДИАЛОГА
Веди сотрудника по структуре, но гибко. Если человек уже ответил на пункт — НЕ переспрашивай.
Закрой по очереди блоки:
1. ПРОБЛЕМА / ВОЗМОЖНОСТЬ — что не так сейчас или какую возможность видит автор?
2. КОНТЕКСТ — кого касается, как часто возникает?
3. ПРЕДЛОЖЕНИЕ — что конкретно предлагается изменить или внедрить?
4. РЕСУРСЫ — что нужно для реализации (люди, деньги, время)?
5. ЭФФЕКТ — какую пользу принесёт? Поощряй измеримые оценки.

Когда закрыты основные блоки (минимум: проблема, предложение, эффект) — скажи, что готов оформить карточку.

# ГРАНИЦЫ
- Не давай обещаний о премии, сроках или принятии идеи.
- При уходе в сторону (жалобы, HR, зарплата) мягко верни к идее.
- Не придумывай за автора факты и цифры.`

async function main() {
  console.log('Seeding database...')
  await setupExtensions()

  // Create test users
  const users = [
    { email: 'anna@can.ru',    name: 'Анна Ковалёва',  dept: 'Операционный департамент', roles: ['employee'] },
    { email: 'curator@can.ru', name: 'Пётр Иванов',    dept: 'HR',                       roles: ['employee', 'curator'] },
    { email: 'impl@can.ru',    name: 'Дмитрий Орлов',  dept: 'IT',                        roles: ['employee', 'implementer'] },
    { email: 'admin@can.ru',   name: 'Администратор',  dept: 'IT',                        roles: ['admin'] },
    { email: 'owner@can.ru',   name: 'Елена Зорина',   dept: 'Дирекция',                  roles: ['owner', 'committee'] },
    { email: 'marat@can.ru',   name: 'Марат Сафин',    dept: 'Клиентский сервис',         roles: ['employee'] },
    { email: 'olga@can.ru',    name: 'Ольга Лебедева', dept: 'Разработка',                roles: ['employee'] },
    { email: 'igor@can.ru',    name: 'Игорь Пономарёв',dept: 'АХО',                       roles: ['employee'] },
    { email: 'sergey@can.ru',  name: 'Сергей Гущин',   dept: 'Финансы',                   roles: ['employee'] },
  ]

  const createdUsers: Record<string, any> = {}
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { roles: u.roles },
      create: u,
    })
    createdUsers[u.email] = user
  }
  console.log(`Created ${users.length} users`)

  const ideaCount = await prisma.idea.count()
  const shouldSeedIdeas = ideaCount === 0
  if (!shouldSeedIdeas) {
    console.log('Ideas already seeded, skipping.')
  }

  // Create AI prompt
  await prisma.aiPrompt.upsert({
    where: { version: 1 },
    update: {},
    create: { version: 1, body: SYSTEM_PROMPT, isActive: true },
  })
  console.log('Created AI prompt v1')

  // Create sample ideas
  if (shouldSeedIdeas) {
  const anna = createdUsers['anna@can.ru']
  const marat = createdUsers['marat@can.ru']
  const olga = createdUsers['olga@can.ru']
  const igor = createdUsers['igor@can.ru']
  const sergey = createdUsers['sergey@can.ru']

  const sampleIdeas = [
    {
      authorId: anna.id, status: 'work', category: 'proc',
      cardData: {
        title: 'QR-приёмка товара на складе вместо ручных накладных',
        problem: 'Приёмка товара на складе ведётся по бумажным накладным: кладовщик вручную сверяет позиции, ошибки находят уже при инвентаризации. На одну фуру уходит до 40 минут.',
        who: 'Кладовщики, операторы склада, отдел учёта — 3 склада, ~25 человек.',
        proposal: 'Печатать QR-код на каждой паллете и сканировать его мобильным терминалом при приёмке. Данные сразу попадают в учётную систему, расхождения подсвечиваются на месте.',
        resources: 'Мобильные терминалы (есть 6 шт.), доработка интеграции с WMS, обучение ~2 часа на смену.',
        effect: 'Сокращение времени приёмки на 60% (с 40 до 16 мин), снижение ошибок учёта.',
        effectEstimate: '~1,1 млн ₽/год',
        openQuestions: 'нет',
      },
    },
    {
      authorId: marat.id, status: 'done', category: 'cx',
      cardData: {
        title: 'Единый шаблон ответа в поддержке для типовых обращений',
        problem: 'Операторы поддержки тратят время на формулировку ответов на повторяющиеся вопросы, тон ответов разнится.',
        who: 'Операторы поддержки первой линии — 40 человек.',
        proposal: 'Библиотека готовых шаблонов с подстановкой данных клиента, встроенная в окно чата.',
        resources: 'Конструктор шаблонов в helpdesk, ревизия 30 типовых сценариев.',
        effect: 'Среднее время ответа −35%, рост CSAT.',
        effectEstimate: 'CSAT +0.4 пункта',
        openQuestions: 'нет',
      },
    },
    {
      authorId: olga.id, status: 'list', category: 'work',
      cardData: {
        title: 'Тихие часы без совещаний для фокусной работы',
        problem: 'Совещания дробят день, разработчикам трудно сосредоточиться на сложных задачах.',
        who: 'Продуктовые и инженерные команды.',
        proposal: 'Закрепить в календаре «тихие часы» 10:00–12:00 без встреч по умолчанию.',
        resources: 'Договорённость в командах, настройка корпоративного календаря.',
        effect: 'Рост доли задач, закрытых в срок; меньше переработок.',
        effectEstimate: 'требует оценки',
        openQuestions: 'нет',
      },
    },
    {
      authorId: sergey.id, status: 'mod', category: 'save',
      cardData: {
        title: 'Автоматическая выгрузка актов сверки контрагентам',
        problem: 'Бухгалтерия вручную формирует и рассылает акты сверки по запросу — это 2–3 дня в конце квартала.',
        who: 'Бухгалтерия, ~8 человек, и контрагенты.',
        proposal: 'Кнопка «Сформировать и отправить» в учётной системе с автоматической выгрузкой и письмом контрагенту.',
        resources: 'Доработка отчёта, шаблон письма, согласование с ИБ.',
        effect: 'Экономия ~30 человеко-часов в квартал.',
        effectEstimate: '~30 чел/час в квартал',
        openQuestions: 'Согласование с ИБ',
      },
    },
    {
      authorId: igor.id, status: 'expert', category: 'save',
      cardData: {
        title: 'Внутренний маркетплейс переиспользования оборудования',
        problem: 'Офисы списывают и закупают однотипное оборудование, не зная о свободном в соседнем подразделении.',
        who: 'Все офисы компании, АХО, закупки.',
        proposal: 'Внутренняя витрина свободного оборудования с заявками на передачу между подразделениями.',
        resources: 'Раздел на портале, процесс передачи между МОЛ.',
        effect: 'Снижение закупок до 15% по ряду категорий.',
        effectEstimate: 'требует оценки',
        openQuestions: 'нет',
      },
    },
  ]

  for (const ideaData of sampleIdeas) {
    const idea = await prisma.idea.create({ data: ideaData })

    // Status log
    await prisma.ideaStatusLog.create({
      data: {
        ideaId: idea.id,
        fromStatus: 'draft',
        toStatus: ideaData.status,
        actorId: ideaData.authorId,
        comment: 'Подана через портал',
      },
    })

    // Add some votes
    const voters = [anna, marat, olga, igor, sergey].filter(u => u.id !== ideaData.authorId).slice(0, 3)
    for (const voter of voters) {
      await prisma.vote.create({ data: { userId: voter.id, ideaId: idea.id } }).catch(() => {})
    }

    // Add implementation for 'work' ideas
    if (ideaData.status === 'work') {
      await prisma.implementation.create({
        data: {
          ideaId: idea.id,
          assigneeId: createdUsers['impl@can.ru'].id,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          effectPlan: 'Сокращение времени приёмки до 16 мин',
        },
      })
    }

    // Add implementation + effect for 'done' ideas
    if (ideaData.status === 'done') {
      await prisma.implementation.create({
        data: {
          ideaId: idea.id,
          assigneeId: createdUsers['impl@can.ru'].id,
          dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          effectPlan: 'Снижение времени ответа на 35%',
          effectFact: 'Время первого ответа сократилось с 6 до 3.8 мин, CSAT +0.4 пункта',
        },
      })
    }
  }
  console.log(`Created ${sampleIdeas.length} sample ideas`)
  } // end if (shouldSeedIdeas)

  // Create ivfflat indexes for pgvector
  try {
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS idx_ideas_embedding ON ideas USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`
    )
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`
    )
    console.log('Created IVFFlat vector indexes')
  } catch (e) {
    console.log('IVFFlat indexes skipped (table may be empty or extension not ready)')
  }

  console.log('Seed complete ✓')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
