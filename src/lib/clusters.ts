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
    ],
  },
  {
    id: "visa",
    name: "Виза",
    intent: "Уже поступил, нужна виза",
    heatLevel: 4,
    keywords: [
      "Как получить визу F-1",
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
