const TOPIC_LABELS: Record<string, string> = {
  basico: "Básico",
  bebidas: "Bebidas",
  caracteres: "Caracteres",
  cultura: "Cultura",
  descripcion: "Descripción",
  familia: "Familia",
  gramatica: "Gramática",
  nombres: "Nombres",
  paises: "Países",
  preguntas: "Preguntas",
  presentaciones: "Presentaciones",
  pronombres: "Pronombres",
  pronunciacion: "Pronunciación",
  puntuacion: "Puntuación",
  radicales: "Radicales",
  saludos: "Saludos",
  tiempo: "Tiempo",
};

export function topicLabel(topic: string): string {
  return TOPIC_LABELS[topic] ?? topic.charAt(0).toLocaleUpperCase("es") + topic.slice(1);
}
