export interface Cluster {
  id: string;
  name: string;
  intent: string;
  heatLevel: number; // 1-5, how "hot" the potential client is
  keywords: string[];
}

export const CLUSTERS: Cluster[] = [
  {
    id: "admission-general",
    name: "Поступление (общее)",
    intent: "Готов поступать, ищет как",
    heatLevel: 5,
    keywords: [
      "Как поступить в США",
      "Поступление в сша",
      "Бакалавриат в США",
      "Gap year перед поступлением в США",
      "Community college США",
      "Перевод из российского вуза в американский",
      "Holistic admission",
      "Отличие бакалавриата США от Европы",
    ],
  },
  {
    id: "masters-phd-mba",
    name: "Магистратура / PhD / MBA",
    intent: "Конкретная программа, горячий клиент",
    heatLevel: 5,
    keywords: [
      "Магистратура в сша",
      "MBA в сша",
      "Phd в сша",
    ],
  },
  {
    id: "scholarships",
    name: "Стипендии и финансирование",
    intent: "Ищет деньги на учёбу",
    heatLevel: 4,
    keywords: [
      "Стипендии в сша",
      "Спортивная стипендия США",
      "Financial aid для иностранных студентов",
      "Need blind admission",
      "FAFSA для иностранцев",
    ],
  },
  {
    id: "exams",
    name: "Экзамены",
    intent: "Подготовка, средняя стадия воронки",
    heatLevel: 3,
    keywords: [
      "Экзамен gre как сдать",
      "Экзамен gmat",
      "Экзамен SAT",
      "AP экзамены для поступления",
      "Подготовка к TOEFL",
      "IELTS или TOEFL для США",
      "Учеба в США без SAT",
    ],
  },
  {
    id: "documents",
    name: "Документы и заявка",
    intent: "Активно готовит документы",
    heatLevel: 4,
    keywords: [
      "эссе для учебы в сша",
      "мотивационное письмо для сша",
      "Рекомендательные письма сша",
      "портфолио для учебы в сша",
      "Common app как заполнять",
      "Интервью учеба в сша",
      "активности для поступления в сша",
      "CSS Profile как заполнить",
      "Как написать why essay",
      "Supplemental essays советы",
      "Успешное интервью в университет",
      "Extracurricular activities для поступления",
      "Волонтерство для поступления в США",
    ],
  },
  {
    id: "universities",
    name: "Выбор вуза",
    intent: "Исследует варианты",
    heatLevel: 3,
    keywords: [
      "Университет сша",
      "Как выбрать вуз сша",
      "лучший универ сша",
      "Гарвард",
      "Гарвард поступить",
      "Стенфорд поступить",
      "Лига плюща",
      "Liberal arts college США",
      "Как попасть в Ivy League",
      "STEM специальности США",
    ],
  },
  {
    id: "visa",
    name: "Виза и после поступления",
    intent: "Уже поступил, нужна виза / OPT",
    heatLevel: 4,
    keywords: [
      "Как получить визу F-1",
      "OPT после учебы в США",
    ],
  },
  {
    id: "student-life",
    name: "Жизнь студента в США",
    intent: "Интересуется бытом и расходами",
    heatLevel: 2,
    keywords: [
      "Кампус тур американского университета",
      "Общежитие в американском университете",
      "Стоимость обучения в США",
      "Подработка для студентов в США",
    ],
  },
  {
    id: "application-process",
    name: "Процесс подачи",
    intent: "Разбирается в процедуре подачи",
    heatLevel: 4,
    keywords: [
      "Application deadline вузы США",
      "Early decision early action",
      "Waitlist вуза США что делать",
      "Dual enrollment программы США",
    ],
  },
];

export function getClusterForKeyword(text: string): Cluster | null {
  const lower = text.toLowerCase();
  for (const cluster of CLUSTERS) {
    if (cluster.keywords.some((k) => k.toLowerCase() === lower)) {
      return cluster;
    }
  }
  return null;
}
