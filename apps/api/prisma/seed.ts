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
ВАЖНО: Приветствуй пользователя («Добрый день», «Привет» и т.п.) ТОЛЬКО в самом первом сообщении диалога.
В последующих ответах — сразу к делу, без повторных приветствий.

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
- Не придумывай за автора факты и цифры.
- Не повторяй приветствие в каждом сообщении — только в первом.`

const SYSTEM_PROMPT_V2 = SYSTEM_PROMPT

const SYSTEM_PROMPT_V3 = `# РОЛЬ
Ты — ассистент портала «Банка Идей» компании АУР (can.ru). Слоган: «Открой идею».
Твоя задача — помочь сотруднику превратить сырую идею в проработанное предложение, задавая уточняющие вопросы.
Ты НЕ оцениваешь идею и НЕ решаешь, будет ли она принята — это делает куратор.
Твоя роль: помочь автору раскрыть мысль максимально полно и понятно.

# ТОН
Дружелюбный, поддерживающий, на «вы». Без канцелярита и бюрократии.
Хвали за конкретику. Один вопрос за раз, не вали всё сразу.
Приветствуй пользователя («Добрый день», «Привет» и т.п.) ТОЛЬКО в самом первом сообщении диалога.
В последующих ответах — сразу к делу, без повторных приветствий.

# ПРОЦЕСС ДИАЛОГА
Перед тем как задать вопрос — проверь раздел «# УЖЕ СОБРАНО». Поля из него уже известны.
НЕ спрашивай о том, что уже собрано. Переходи сразу к первому незаполненному блоку.

Закрой по очереди блоки (только незаполненные):
1. ПРОБЛЕМА — что не так сейчас или какую возможность видит автор?
2. КОНТЕКСТ (who) — кого касается, как часто возникает?
3. ПРЕДЛОЖЕНИЕ — что конкретно предлагается изменить или внедрить?
4. РЕСУРСЫ — что нужно для реализации (люди, деньги, время)?
5. ЭФФЕКТ — какую пользу принесёт? Поощряй измеримые оценки.

Когда закрыты основные блоки (минимум: problem, proposal, effect) — скажи, что готов оформить карточку.

# ЗАПОЛНЕНИЕ ПОЛЕЙ JSON
Заполняй поля (problem, proposal, effect и т.д.) по мере получения информации — даже черновым вариантом.
Не пиши в полях «Требуется уточнение» или аналогичные заглушки — оставь поле пустым если данных нет.
done=true ТОЛЬКО когда problem, proposal и effect реально заполнены содержательным текстом (не пустые).

# ГРАНИЦЫ
- Не давай обещаний о премии, сроках или принятии идеи.
- При уходе в сторону (жалобы, HR, зарплата) мягко верни к идее: «Это важно, но для портала нужна идея по улучшению процессов. Расскажите...»
- Не придумывай за автора факты и цифры.
- Не повторяй приветствие в каждом сообщении — только в первом.`

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
  const shouldSeedIdeas = ideaCount < 16
  if (!shouldSeedIdeas) {
    console.log('Ideas already seeded (>= 16), skipping.')
  } else if (ideaCount > 0) {
    // Old partial seed exists — clear it so we can reseed cleanly
    console.log(`Clearing ${ideaCount} old ideas to reseed with full dataset...`)
    await prisma.vote.deleteMany()
    await prisma.comment.deleteMany()
    await prisma.ideaStatusLog.deleteMany()
    await prisma.slaTimer.deleteMany()
    await prisma.implementation.deleteMany()
    await prisma.notification.deleteMany()
    await prisma.pointLedger.deleteMany()
    await prisma.aiSession.deleteMany()
    await prisma.idea.deleteMany()
  }

  // Create AI prompt
  await prisma.aiPrompt.upsert({
    where: { version: 1 },
    update: {},
    create: { version: 1, body: SYSTEM_PROMPT, isActive: true },
  })
  // v2: no repeated greetings
  await prisma.aiPrompt.upsert({
    where: { version: 2 },
    update: {},
    create: { version: 2, body: SYSTEM_PROMPT_V2, isActive: true },
  })
  // v3: no re-asking collected fields + no placeholder text in JSON fields
  await prisma.aiPrompt.upsert({
    where: { version: 3 },
    update: {},
    create: { version: 3, body: SYSTEM_PROMPT_V3, isActive: true },
  })
  console.log('Created AI prompt v1')

  // Create sample ideas
  if (shouldSeedIdeas) {
  const anna    = createdUsers['anna@can.ru']
  const curator = createdUsers['curator@can.ru']
  const impl    = createdUsers['impl@can.ru']
  const marat   = createdUsers['marat@can.ru']
  const olga    = createdUsers['olga@can.ru']
  const igor    = createdUsers['igor@can.ru']
  const sergey  = createdUsers['sergey@can.ru']
  const owner   = createdUsers['owner@can.ru']

  const allEmployees = [anna, marat, olga, igor, sergey]

  const sampleIdeas = [
    // --- status: work ---
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
    // --- status: done ---
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
    // --- status: list ---
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
    // --- status: mod ---
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
    // --- status: expert ---
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
    // --- status: draft ---
    {
      authorId: anna.id, status: 'draft', category: 'it',
      cardData: {
        title: 'Единый корпоративный дашборд показателей',
        problem: 'Менеджеры открывают 5–7 разных систем, чтобы собрать еженедельный отчёт по операционным метрикам.',
        who: 'Руководители отделов и направлений, ~30 человек.',
        proposal: 'Внутренний дашборд на базе Apache Superset с автоматическим подключением к 1С, CRM и WMS. Единый экран с ключевыми показателями, без доступа к исходным данным для рядовых менеджеров.',
        resources: 'IT-инфраструктура: сервер есть. Разработка: 2 backend-разработчика, 3 месяца.',
        effect: 'Экономия ~4 часов в неделю на каждого менеджера. Оперативность принятия решений.',
        effectEstimate: '~2,4 млн ₽/год (трудозатраты)',
        openQuestions: 'Согласование доступов с ИБ, выбор формата KPI',
      },
    },
    // --- status: rework ---
    {
      authorId: marat.id, status: 'rework', category: 'cx',
      cardData: {
        title: 'Автоответчик для первой линии поддержки в нерабочее время',
        problem: 'Клиенты пишут в 8 вечера и ждут ответа до утра. Негативный опыт и жалобы.',
        who: 'Клиенты компании, операторы поддержки.',
        proposal: 'Настроить умный автоответчик с распознаванием типа обращения и базой FAQ для нерабочего времени. Срочные обращения — эскалация дежурному.',
        resources: 'Готовые решения на рынке (Яндекс.Диалоги, Sber Salute). Интеграция с helpdesk ~2 недели.',
        effect: 'Снижение потока необработанных обращений на 40%, рост лояльности.',
        effectEstimate: 'NPS +5 пунктов',
        openQuestions: 'Нужно уточнить порог «срочного» обращения',
      },
    },
    // --- status: list ---
    {
      authorId: olga.id, status: 'list', category: 'it',
      cardData: {
        title: 'GitLab CI/CD пайплайн для автоматического деплоя',
        problem: 'Деплой в staging и production делается вручную: SSH, ручные команды, частые ошибки из-за человеческого фактора.',
        who: 'Команда разработки, ~12 человек.',
        proposal: 'Настроить GitLab CI/CD: автоматические тесты при MR, деплой в staging при мерже в develop, деплой в production при теге релиза.',
        resources: 'GitLab уже используется. Работа DevOps-инженера: 2 недели.',
        effect: 'Устранение ошибок деплоя, ускорение выхода релизов с 5 до 1 дня.',
        effectEstimate: 'требует оценки',
        openQuestions: 'нет',
      },
    },
    // --- status: list ---
    {
      authorId: sergey.id, status: 'list', category: 'save',
      cardData: {
        title: 'Переход на электронный документооборот с поставщиками',
        problem: 'Обмен первичной документацией с поставщиками — бумажный: курьеры, почта, задержки до 5 дней. Бухгалтерия тратит время на ручную сверку.',
        who: 'Бухгалтерия, отдел закупок, ~150 поставщиков.',
        proposal: 'Подключиться к системе ЭДО (Контур.Диадок или СБИС). Перевести топ-50 поставщиков в течение 3 месяцев.',
        resources: 'Лицензия ЭДО: ~120 тыс. ₽/год. Настройка интеграции с 1С: 1 неделя.',
        effect: 'Сокращение срока оборота документов с 5 дней до 1 дня. Экономия на курьерах и бумаге.',
        effectEstimate: '~800 тыс. ₽/год',
        openQuestions: 'нет',
      },
    },
    // --- status: expert ---
    {
      authorId: anna.id, status: 'expert', category: 'proc',
      cardData: {
        title: 'Чек-листы онбординга нового сотрудника в корпоративном портале',
        problem: 'Новые сотрудники теряются в первые недели: непонятно, какие системы настроить, к кому обратиться, какие документы подписать.',
        who: 'Все новые сотрудники (~80 в год), HR, IT-поддержка.',
        proposal: 'Автоматический чек-лист в корпоративном портале с задачами по ролям: оформить пропуск, получить ноутбук, пройти инструктаж по ИБ и т. д.',
        resources: 'Доработка HR-портала, шаблоны чек-листов по 12 ролям, 2 недели разработки.',
        effect: 'Снижение нагрузки на HR на 20%, ускорение выхода сотрудника на полную эффективность.',
        effectEstimate: 'требует оценки',
        openQuestions: 'нет',
      },
    },
    // --- status: work ---
    {
      authorId: igor.id, status: 'work', category: 'save',
      cardData: {
        title: 'Датчики движения для управления освещением в переговорных',
        problem: 'Переговорные комнаты часто пустуют, но свет горит весь день. Расходы на электроэнергию неоправданно высокие.',
        who: 'АХО, все сотрудники офиса, ~500 человек в 3 офисах.',
        proposal: 'Установить датчики движения в переговорных комнатах. Свет включается автоматически при входе и гаснет через 10 минут после ухода.',
        resources: 'Датчики: ~300 тыс. ₽ (60 штук). Монтаж: 2 дня. Срок окупаемости — 1 год.',
        effect: 'Снижение потребления электроэнергии в переговорных на 40%.',
        effectEstimate: '~360 тыс. ₽/год',
        openQuestions: 'нет',
      },
    },
    // --- status: reject ---
    {
      authorId: marat.id, status: 'reject', category: 'cx',
      cardData: {
        title: 'Подарочные карты клиентам за отзывы',
        problem: 'Мало отзывов на внешних площадках, трудно формировать репутацию.',
        who: 'Клиенты компании.',
        proposal: 'Дарить подарочные карты номиналом 500 ₽ за оставленный отзыв на Яндекс.Картах или 2ГИС.',
        resources: 'Бюджет на карты: ~200 тыс. ₽/мес. Партнёрский договор с ретейлером.',
        effect: 'Рост количества отзывов в 3 раза, улучшение рейтинга.',
        effectEstimate: 'требует оценки',
        openQuestions: 'Риск нарушения правил площадок',
      },
    },
    // --- status: duplicate ---
    {
      authorId: olga.id, status: 'duplicate', category: 'work',
      cardData: {
        title: 'Запрет совещаний в первой половине дня',
        problem: 'Утром сложнее всего сосредоточиться на сложных задачах из-за постоянных встреч.',
        who: 'Все сотрудники.',
        proposal: 'Запретить планировать встречи до 12:00 во всём корпоративном календаре.',
        resources: 'Только договорённость и настройка календаря.',
        effect: 'Улучшение продуктивности и настроения команды.',
        effectEstimate: 'требует оценки',
        openQuestions: 'нет',
      },
    },
    // --- status: mod ---
    {
      authorId: sergey.id, status: 'mod', category: 'it',
      cardData: {
        title: 'Двухфакторная аутентификация для всех корпоративных систем',
        problem: 'Несколько инцидентов ИБ за год связаны с компрометацией паролей. Корпоративная почта и 1С доступны только по паролю.',
        who: 'Все сотрудники компании, ИТ-отдел.',
        proposal: 'Внедрить 2FA (TOTP через Google/Яндекс Authenticator) для VPN, корпоративной почты и 1С. Обязательно для всех сотрудников.',
        resources: 'Настройка RADIUS/LDAP + Authelia: 3 недели работы ИБ и IT.',
        effect: 'Снижение риска несанкционированного доступа на 90%. Соответствие требованиям регулятора.',
        effectEstimate: 'Снижение риска ИБ-инцидентов',
        openQuestions: 'нет',
      },
    },
    // --- status: list ---
    {
      authorId: anna.id, status: 'list', category: 'prod',
      cardData: {
        title: 'Мобильное приложение для курьеров с трекингом доставки',
        problem: 'Курьеры звонят диспетчерам по любому поводу: нет навигации, нет подтверждения получения. Диспетчеры тратят половину дня на звонки.',
        who: 'Курьеры (~80 человек), диспетчеры (5 человек), клиенты.',
        proposal: 'Мобильное приложение для Android: маршрут, сканирование подписи клиента, автоматическое закрытие заказа. Интеграция с нашей TMS.',
        resources: 'Разработка iOS/Android: 4 месяца, 2 разработчика. Интеграция с TMS: 3 недели.',
        effect: 'Снижение нагрузки на диспетчеров на 70%, рост NPS клиентов.',
        effectEstimate: '~1,8 млн ₽/год (высвобождение диспетчеров)',
        openQuestions: 'Нужно определиться с кросс-платформой (Flutter vs React Native)',
      },
    },
    // --- status: archive ---
    {
      authorId: igor.id, status: 'archive', category: 'save',
      cardData: {
        title: 'Переход на облачный офис вместо Microsoft Office',
        problem: 'Лицензии Microsoft Office стоят дорого, при этом большинство сотрудников использует только Word и Excel.',
        who: 'Все офисные сотрудники, ~300 человек.',
        proposal: 'Перейти на МойОфис или LibreOffice для рядовых сотрудников, оставить Microsoft только для топ-менеджеров.',
        resources: 'Закупка лицензий МойОфис, обучение сотрудников (~5 часов), поддержка IT при переходе.',
        effect: 'Экономия на лицензиях до 60%.',
        effectEstimate: '~2,1 млн ₽/год',
        openQuestions: 'Совместимость документов с партнёрами, которые используют MS Office',
      },
    },
  ]

  const createdIdeas: any[] = []

  for (const ideaData of sampleIdeas) {
    const idea = await prisma.idea.create({ data: ideaData })
    createdIdeas.push({ idea, ideaData })

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

    // Add some votes — varied distribution
    const allVoters = allEmployees.filter(u => u.id !== ideaData.authorId)
    const voteCount = ['done', 'work', 'expert', 'list'].includes(ideaData.status)
      ? Math.min(allVoters.length, 4)
      : ['mod', 'rework'].includes(ideaData.status)
        ? 2
        : 1
    const voters = allVoters.slice(0, voteCount)
    for (const voter of voters) {
      await prisma.vote.create({ data: { userId: voter.id, ideaId: idea.id } }).catch(() => {})
    }

    // Add implementation for 'work' ideas
    if (ideaData.status === 'work') {
      await prisma.implementation.create({
        data: {
          ideaId: idea.id,
          assigneeId: impl.id,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          effectPlan: (ideaData.cardData as any).effect,
        },
      })
    }

    // Add implementation + effect for 'done' ideas
    if (ideaData.status === 'done') {
      await prisma.implementation.create({
        data: {
          ideaId: idea.id,
          assigneeId: impl.id,
          dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          effectPlan: (ideaData.cardData as any).effect,
          effectFact: 'Время первого ответа сократилось с 6 до 3.8 мин, CSAT +0.4 пункта',
        },
      })
    }

    // SLA timers for ideas in 'mod' or 'expert' status
    if (ideaData.status === 'mod' || ideaData.status === 'expert') {
      await prisma.slaTimer.create({
        data: {
          ideaId: idea.id,
          deadline: new Date(Date.now() + (ideaData.status === 'mod' ? 5 : 14) * 24 * 60 * 60 * 1000),
        },
      })
    }
  }

  console.log(`Created ${sampleIdeas.length} sample ideas`)

  // --- Comments (on select ideas) ---
  const workIdea  = createdIdeas.find(r => r.ideaData.status === 'work')?.idea
  const listIdea  = createdIdeas.find(r => r.ideaData.status === 'list' && r.ideaData.category === 'work')?.idea
  const expertIdea = createdIdeas.find(r => r.ideaData.status === 'expert' && r.ideaData.category === 'save')?.idea

  if (workIdea) {
    await prisma.comment.create({
      data: {
        ideaId: workIdea.id,
        authorId: curator.id,
        body: 'Отличная идея! Мы уже обсудили с ИТ-отделом — интеграция с WMS реалистична. Возьмём в работу в следующем спринте.',
      },
    })
    await prisma.comment.create({
      data: {
        ideaId: workIdea.id,
        authorId: marat.id,
        body: 'Поддерживаю! У нас на складе №2 та же проблема. Хорошо бы сначала сделать пилот там.',
      },
    })
  }

  if (listIdea) {
    await prisma.comment.create({
      data: {
        ideaId: listIdea.id,
        authorId: olga.id,
        body: 'Мы пробовали это неформально в одной команде — работает. Прирост закрытых задач в срок около 20%.',
      },
    })
    await prisma.comment.create({
      data: {
        ideaId: listIdea.id,
        authorId: igor.id,
        body: 'Главное — договориться с менеджментом, чтобы не было исключений для «срочных» встреч, которые всегда найдутся.',
      },
    })
    await prisma.comment.create({
      data: {
        ideaId: listIdea.id,
        authorId: curator.id,
        body: 'Вынес на обсуждение в HRD. Принципиальных возражений нет, нужно согласовать формат.',
        isInternal: true,
      },
    })
  }

  if (expertIdea) {
    await prisma.comment.create({
      data: {
        ideaId: expertIdea.id,
        authorId: sergey.id,
        body: 'По нашим данным, только в московском офисе числится около 40 единиц оборудования, которые можно перераспределить.',
      },
    })
    await prisma.comment.create({
      data: {
        ideaId: expertIdea.id,
        authorId: curator.id,
        body: 'Передано эксперту из закупок. Ждём оценку трудозатрат на разработку раздела.',
        isInternal: true,
      },
    })
  }

  console.log('Created sample comments')

  // --- Notifications for anna@can.ru ---
  await prisma.notification.create({
    data: {
      userId: anna.id,
      text: 'Ваша идея «QR-приёмка товара на складе» взята в работу! Ответственный — Дмитрий Орлов.',
      icon: 'rocket',
      accent: true,
    },
  })
  await prisma.notification.create({
    data: {
      userId: anna.id,
      text: 'Ваша идея «Чек-листы онбординга» направлена на экспертизу.',
      icon: 'users',
      accent: false,
    },
  })
  await prisma.notification.create({
    data: {
      userId: anna.id,
      text: 'Коллега Марат Сафин проголосовал за вашу идею «Мобильное приложение для курьеров».',
      icon: 'arrowUp',
      accent: false,
    },
  })

  console.log('Created sample notifications')

  // --- Point ledger entries ---
  // anna: подала несколько идей, одна взята в работу
  await prisma.pointLedger.create({
    data: {
      userId: anna.id,
      delta: 10,
      reason: 'Подача идеи «QR-приёмка товара на складе»',
      refIdeaId: createdIdeas.find(r => r.ideaData.status === 'work' && r.ideaData.authorId === anna.id)?.idea.id,
    },
  })
  await prisma.pointLedger.create({
    data: {
      userId: anna.id,
      delta: 20,
      reason: 'Идея «QR-приёмка товара на складе» прошла модерацию',
      refIdeaId: createdIdeas.find(r => r.ideaData.status === 'work' && r.ideaData.authorId === anna.id)?.idea.id,
    },
  })
  await prisma.pointLedger.create({
    data: {
      userId: anna.id,
      delta: 50,
      reason: 'Идея «QR-приёмка товара на складе» взята в работу',
      refIdeaId: createdIdeas.find(r => r.ideaData.status === 'work' && r.ideaData.authorId === anna.id)?.idea.id,
    },
  })
  await prisma.pointLedger.create({
    data: {
      userId: anna.id,
      delta: 10,
      reason: 'Подача идеи «Единый корпоративный дашборд показателей»',
      refIdeaId: createdIdeas.find(r => r.ideaData.status === 'draft' && r.ideaData.authorId === anna.id)?.idea.id,
    },
  })

  // marat: идея реализована
  await prisma.pointLedger.create({
    data: {
      userId: marat.id,
      delta: 10,
      reason: 'Подача идеи «Единый шаблон ответа в поддержке»',
      refIdeaId: createdIdeas.find(r => r.ideaData.status === 'done')?.idea.id,
    },
  })
  await prisma.pointLedger.create({
    data: {
      userId: marat.id,
      delta: 20,
      reason: 'Идея «Единый шаблон ответа в поддержке» прошла модерацию',
      refIdeaId: createdIdeas.find(r => r.ideaData.status === 'done')?.idea.id,
    },
  })
  await prisma.pointLedger.create({
    data: {
      userId: marat.id,
      delta: 50,
      reason: 'Идея «Единый шаблон ответа в поддержке» взята в работу',
      refIdeaId: createdIdeas.find(r => r.ideaData.status === 'done')?.idea.id,
    },
  })
  await prisma.pointLedger.create({
    data: {
      userId: marat.id,
      delta: 100,
      reason: 'Идея «Единый шаблон ответа в поддержке» реализована',
      refIdeaId: createdIdeas.find(r => r.ideaData.status === 'done')?.idea.id,
    },
  })

  // igor: идея взята в работу
  await prisma.pointLedger.create({
    data: {
      userId: igor.id,
      delta: 10,
      reason: 'Подача идеи «Датчики движения для управления освещением»',
      refIdeaId: createdIdeas.find(r => r.ideaData.status === 'work' && r.ideaData.authorId === igor.id)?.idea.id,
    },
  })
  await prisma.pointLedger.create({
    data: {
      userId: igor.id,
      delta: 20,
      reason: 'Идея «Датчики движения» прошла модерацию',
      refIdeaId: createdIdeas.find(r => r.ideaData.status === 'work' && r.ideaData.authorId === igor.id)?.idea.id,
    },
  })
  await prisma.pointLedger.create({
    data: {
      userId: igor.id,
      delta: 50,
      reason: 'Идея «Датчики движения» взята в работу',
      refIdeaId: createdIdeas.find(r => r.ideaData.status === 'work' && r.ideaData.authorId === igor.id)?.idea.id,
    },
  })

  // sergey: баллы за модерацию
  await prisma.pointLedger.create({
    data: {
      userId: sergey.id,
      delta: 10,
      reason: 'Подача идеи «Автоматическая выгрузка актов сверки»',
      refIdeaId: createdIdeas.find(r => r.ideaData.status === 'mod' && r.ideaData.authorId === sergey.id)?.idea.id,
    },
  })

  console.log('Created sample point ledger entries')

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
