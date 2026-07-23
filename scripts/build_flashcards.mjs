import fs from "node:fs/promises";
import Papa from "papaparse";

const outputPath = new URL("../chino_flashcards.csv", import.meta.url);

const rows = [
  ["palabra", "pronombres", "我", "wǒ", "yo", "Pronombre personal de primera persona del singular.", "我是学生。", "Wǒ shì xuésheng.", "Soy estudiante.", "1-3", "pronombre;basico"],
  ["palabra", "pronombres", "你", "nǐ", "tú", "Pronombre informal de segunda persona del singular.", "你叫什么名字？", "Nǐ jiào shénme míngzi?", "¿Cómo te llamas?", "1-3", "pronombre;basico"],
  ["palabra", "pronombres", "您", "nín", "usted", "Tratamiento respetuoso de segunda persona, equivalente a «usted»; se usa con personas mayores, superiores o en contextos formales.", "您最近怎么样？", "Nín zuìjìn zěnmeyàng?", "¿Cómo está usted últimamente?", "1-4", "pronombre;formal;cortesia"],
  ["palabra", "pronombres", "他", "tā", "él", "Pronombre masculino de tercera persona del singular.", "他姓吴。", "Tā xìng Wú.", "Él se apellida Wu.", "1;4;8", "pronombre"],
  ["palabra", "pronombres", "她", "tā", "ella", "Pronombre femenino de tercera persona del singular; se pronuncia igual que 他.", "她是Fátima。", "Tā shì Fátima.", "Ella es Fátima.", "1;5;9", "pronombre"],
  ["palabra", "pronombres", "它", "tā", "pronombre para animales y cosas", "Pronombre de tercera persona para animales u objetos; se pronuncia igual que 他 y 她.", "它很好。", "Tā hěn hǎo.", "Está muy bien.", "1-2", "pronombre;animales;objetos"],
  ["palabra", "pronombres", "们", "men", "sufijo de plural", "Se añade sobre todo a pronombres y sustantivos de persona; no es un plural general para objetos.", "你们", "nǐmen", "vosotros / ustedes", "1-2;6;15", "gramatica;plural"],
  ["palabra", "pronombres", "我们", "wǒmen", "nosotros / nosotras", "Plural de 我.", "我们是学生。", "Wǒmen shì xuésheng.", "Somos estudiantes.", "1;4-5", "pronombre;plural"],
  ["palabra", "pronombres", "你们", "nǐmen", "vosotros / ustedes", "Plural de 你.", "你们最近怎么样？", "Nǐmen zuìjìn zěnmeyàng?", "¿Cómo estáis últimamente? / ¿Cómo están ustedes últimamente?", "3-5;9", "pronombre;plural"],
  ["concepto", "pronombres", "他／她／它", "tā / tā / tā", "pronombres homófonos", "En mandarín hablado, 他, 她 y 它 se pronuncian igual; la diferencia solo aparece en la escritura.", "他、她、它都读 tā。", "Tā, tā, tā dōu dú tā.", "Los tres caracteres se leen tā.", "1-2", "pronunciacion;pronombre"],

  ["concepto", "caracteres", "笔顺", "bǐshùn", "orden de los trazos", "Los caracteres se escriben siguiendo un orden convencional de trazos.", "你", "nǐ", "tú", "1-3", "escritura;trazos"],
  ["concepto", "caracteres", "先左后右", "xiān zuǒ hòu yòu", "primero la izquierda y después la derecha", "Regla básica de escritura para caracteres con una parte a la izquierda y otra a la derecha.", "你", "nǐ", "El radical 亻 se escribe antes que 尔.", "1-3", "escritura;trazos"],
  ["concepto", "caracteres", "先上后下", "xiān shàng hòu xià", "primero la parte de arriba y después la de abajo", "Regla básica de escritura para caracteres con partes superiores e inferiores.", "您", "nín", "La parte superior se escribe antes que 心.", "1-3", "escritura;trazos"],
  ["concepto", "caracteres", "左右结构", "zuǒyòu jiégòu", "estructura izquierda-derecha", "El carácter se divide en un componente izquierdo y otro derecho.", "你", "nǐ", "亻 a la izquierda y 尔 a la derecha.", "3", "estructura;caracter"],
  ["concepto", "caracteres", "上下结构", "shàngxià jiégòu", "estructura arriba-abajo", "El carácter se divide en un componente superior y otro inferior.", "您", "nín", "你 arriba y 心 abajo.", "3", "estructura;caracter"],
  ["concepto", "caracteres", "全包围结构", "quán bāowéi jiégòu", "estructura totalmente cerrada", "Un componente exterior rodea por completo al componente interior.", "国、因", "guó, yīn", "Ejemplos de caracteres con estructura totalmente cerrada.", "3", "estructura;caracter"],
  ["concepto", "caracteres", "半包围结构", "bàn bāowéi jiégòu", "estructura semicerrada", "Un componente rodea parcialmente al resto del carácter.", "过、周", "guò, zhōu", "Ejemplos de caracteres con estructura semicerrada.", "3", "estructura;caracter"],
  ["concepto", "caracteres", "独体字", "dútǐzì", "carácter simple", "Carácter formado por una sola unidad, sin componentes estructurales separables.", "我、山", "wǒ, shān", "Ejemplos de caracteres simples.", "3", "estructura;caracter"],
  ["concepto", "caracteres", "部首", "bùshǒu", "radical", "Componente principal que se emplea para clasificar un carácter en los diccionarios. Cada carácter se clasifica por un radical, aunque pueda contener varios componentes.", "您 → 心", "nín → xīn", "En 您, el radical de clasificación es 心.", "3", "radical;diccionario"],
  ["palabra", "radicales", "心／忄", "xīn", "corazón", "心 significa «corazón» y puede funcionar como radical; cuando aparece en el lateral, suele adoptar la forma 忄.", "您", "nín", "usted", "3", "radical;caracter"],
  ["palabra", "radicales", "人／亻", "rén", "persona", "人 significa 'persona'; como componente lateral suele escribirse 亻.", "你、他", "nǐ, tā", "tú; él", "3;6", "radical;caracter"],
  ["palabra", "radicales", "女", "nǚ", "mujer / femenino", "Palabra y radical relacionados con la mujer o lo femenino.", "她、好", "tā, hǎo", "ella; bien", "6;10", "radical;familia"],
  ["palabra", "radicales", "父", "fù", "padre", "Carácter y componente relacionados con «padre».", "爸爸", "bàba", "papá", "6-7", "radical;familia"],
  ["palabra", "radicales", "口", "kǒu", "boca", "Carácter y radical relacionados con la boca o el habla.", "吗", "ma", "partícula interrogativa", "10", "radical;caracter"],
  ["palabra", "radicales", "门", "mén", "puerta", "Carácter que significa 'puerta'.", "门", "mén", "puerta", "6", "caracter;basico"],
  ["palabra", "radicales", "子", "zǐ", "hijo / niño (como carácter o componente)", "Como carácter o componente aporta la idea de «hijo» o «niño»; en el habla cotidiana se dice normalmente 儿子 para «hijo» y 孩子 para «niño» o «hijo».", "好", "hǎo", "bien", "10", "caracter;familia"],
  ["concepto", "caracteres", "女＋子＝好", "nǚ + zǐ = hǎo", "composición de 好", "Mnemotecnia tradicional de las notas: 女 y 子 forman 好, 'bueno/bien'. No describe por sí sola el uso moderno del carácter.", "好", "hǎo", "bien / bueno", "10", "etimologia;mnemotecnia"],

  ["palabra", "saludos", "好", "hǎo", "bien / bueno", "Adjetivo básico con sentido positivo.", "很好", "hěn hǎo", "muy bien", "4-5;10;13", "basico;saludo"],
  ["frase", "saludos", "你好！", "Nǐ hǎo!", "¡Hola!", "Saludo básico dirigido a una persona.", "你好！", "Nǐ hǎo!", "¡Hola!", "5;9", "saludo;basico"],
  ["palabra", "gramatica", "吗", "ma", "partícula interrogativa para preguntas de sí o no", "Se coloca al final de una oración afirmativa para convertirla en una pregunta cerrada.", "你是学生吗？", "Nǐ shì xuésheng ma?", "¿Eres estudiante?", "3-5;10", "particula;pregunta"],
  ["frase", "saludos", "你好吗？", "Nǐ hǎo ma?", "¿Estás bien?", "Pregunta literalmente por el bienestar de la otra persona. Es correcta, pero como saludo cotidiano suele sonar más propia de un manual; para preguntar cómo está alguien últimamente es más natural 你最近怎么样？", "你好吗？我很好。", "Nǐ hǎo ma? Wǒ hěn hǎo.", "¿Estás bien? Estoy muy bien.", "3-5", "saludo;pregunta"],
  ["palabra", "saludos", "怎么样", "zěnmeyàng", "cómo / qué tal", "Expresión que sirve para preguntar por el estado de alguien o algo, pedir una opinión o preguntar cómo es algo.", "您怎么样？", "Nín zěnmeyàng?", "¿Qué tal está usted?", "3-5;15", "pregunta;saludo"],
  ["frase", "saludos", "你们怎么样？", "Nǐmen zěnmeyàng?", "¿Qué tal estáis? / ¿Cómo están ustedes?", "Pregunta por el estado de varias personas.", "你们怎么样？", "Nǐmen zěnmeyàng?", "¿Cómo estáis?", "3-5", "saludo;plural"],
  ["palabra", "descripcion", "很", "hěn", "muy", "Adverbio de grado; en muchas oraciones con predicado adjetival aparece entre el sujeto y el adjetivo sin traducirse necesariamente como «muy».", "我很好。", "Wǒ hěn hǎo.", "Estoy muy bien.", "3-5", "adverbio;grado"],
  ["frase", "descripcion", "很好", "hěn hǎo", "muy bien", "Respuesta positiva al preguntar cómo está alguien.", "我很好。", "Wǒ hěn hǎo.", "Estoy muy bien.", "3-5", "estado;saludo"],
  ["palabra", "gramatica", "不", "bù", "no", "Adverbio de negación que se coloca antes de un verbo o adjetivo.", "不好", "bù hǎo", "mal / no estar bien", "4", "negacion;basico"],
  ["frase", "descripcion", "不好", "bù hǎo", "mal / no estar bien", "Valoración o estado negativo.", "我最近不太好。", "Wǒ zuìjìn bú tài hǎo.", "Últimamente no estoy muy bien.", "4-5", "estado;negacion"],
  ["palabra", "descripcion", "一般", "yìbān", "normal / corriente / del montón", "Describe algo de calidad media o poco destacable; según el contexto, también puede significar «por lo general».", "这家餐厅很一般。", "Zhè jiā cāntīng hěn yìbān.", "Este restaurante es del montón.", "4", "descripcion;valoracion"],
  ["frase", "saludos", "您最近怎么样？", "Nín zuìjìn zěnmeyàng?", "¿Cómo está usted últimamente?", "Versión respetuosa de la pregunta por cómo le va a alguien últimamente.", "您最近怎么样？", "Nín zuìjìn zěnmeyàng?", "¿Cómo está usted últimamente?", "3-4", "saludo;formal"],
  ["frase", "saludos", "我很好。", "Wǒ hěn hǎo.", "Estoy muy bien.", "Respuesta positiva sobre el propio estado.", "您最近怎么样？我很好。", "Nín zuìjìn zěnmeyàng? Wǒ hěn hǎo.", "¿Cómo está usted últimamente? Estoy muy bien.", "3-5", "respuesta;saludo"],
  ["frase", "saludos", "你们好吗？", "Nǐmen hǎo ma?", "¿Estáis bien? / ¿Están bien ustedes?", "Pregunta cerrada dirigida a varias personas.", "我们还行。", "Wǒmen hái xíng.", "Estamos bastante bien.", "4;9", "pregunta;plural"],
  ["frase", "saludos", "我们还行。", "Wǒmen hái xíng.", "Estamos bastante bien. / Vamos tirando.", "Respuesta coloquial y moderadamente positiva sobre el estado de un grupo.", "你们最近怎么样？我们还行。", "Nǐmen zuìjìn zěnmeyàng? Wǒmen hái xíng.", "¿Cómo estáis últimamente? Estamos bastante bien.", "4", "respuesta;plural"],
  ["palabra", "gramatica", "呢", "ne", "¿y…? / partícula que retoma la pregunta", "Después de un tema, devuelve la misma pregunta: «¿y tú?», «¿y él?».", "你呢？", "Nǐ ne?", "¿Y tú?", "6;15", "particula;pregunta"],
  ["frase", "saludos", "你呢？", "Nǐ ne?", "¿Y tú?", "Pregunta el mismo dato sobre la otra persona sin repetir toda la oración.", "我很好，你呢？", "Wǒ hěn hǎo, nǐ ne?", "Estoy muy bien, ¿y tú?", "6;15", "pregunta;conversacion"],
  ["palabra", "basico", "大", "dà", "grande", "Adjetivo básico; forma parte de 大家.", "大家", "dàjiā", "todos / todo el mundo", "5-6;15", "adjetivo;caracter"],
  ["palabra", "basico", "家", "jiā", "casa / familia / hogar", "Sustantivo básico; forma parte de 大家.", "大家", "dàjiā", "todos / todo el mundo", "6;15", "sustantivo;caracter"],
  ["palabra", "pronombres", "大家", "dàjiā", "todos / todo el mundo", "Pronombre colectivo para un grupo de personas; no equivale a «todos» delante de cualquier sustantivo.", "大家好！", "Dàjiā hǎo!", "¡Hola a todos!", "6;9;15", "plural;saludo"],
  ["palabra", "gramatica", "也", "yě", "también", "Adverbio que suele colocarse antes del verbo o predicado.", "我也很好。", "Wǒ yě hěn hǎo.", "Yo también estoy muy bien.", "6;15", "adverbio;basico"],

  ["concepto", "puntuacion", "标点符号", "biāodiǎn fúhào", "puntuación china", "En chino se usan signos de ancho completo: la coma ，, el punto 。, el signo de exclamación ！ y el de interrogación ？. No se utilizan los signos de apertura españoles (¡, ¿).", "你好！你好吗？", "Nǐ hǎo! Nǐ hǎo ma?", "¡Hola! ¿Estás bien?", "5", "puntuacion;escritura"],
  ["concepto", "cultura", "送礼禁忌", "sònglǐ jìnjì", "tabúes al hacer regalos", "Las notas enumeran regalos que algunas personas evitan por homófonos o asociaciones culturales. Son convenciones culturales, no reglas universales.", "送礼", "sònglǐ", "hacer un regalo", "5", "cultura;regalos"],
  ["concepto", "cultura", "钟／送钟", "zhōng / sòng zhōng", "reloj / regalar un reloj", "Algunas personas evitan regalar relojes porque 送钟 suena igual que 送终, expresión relacionada con acompañar a alguien en sus últimos momentos.", "别送钟。", "Bié sòng zhōng.", "No regales un reloj.", "5", "cultura;regalos;homofono"],
  ["concepto", "cultura", "伞／散", "sǎn / sàn", "paraguas / separarse", "Regalar un paraguas puede asociarse con la separación porque 伞 y 散 tienen pronunciaciones parecidas.", "送伞", "sòng sǎn", "regalar un paraguas", "5", "cultura;regalos;homofono"],
  ["concepto", "cultura", "梨／离", "lí / lí", "pera / separarse", "Regalar una pera puede evocar separación porque 梨 suena igual que 离, 'separarse o alejarse'.", "送梨", "sòng lí", "regalar una pera", "5", "cultura;regalos;homofono"],
  ["concepto", "cultura", "鞋／邪", "xié / xié", "zapatos / mal", "En algunas tradiciones se evita regalar zapatos por su semejanza sonora con 邪 («mal» o «maligno») o por asociarlos con la idea de que alguien se aleje.", "送鞋", "sòng xié", "regalar zapatos", "5", "cultura;regalos;homofono"],
  ["concepto", "cultura", "绿帽子", "lǜ màozi", "sombrero verde", "En la expresión 戴绿帽子, llevar un sombrero verde significa que a un hombre le ha sido infiel su pareja; por eso se considera un regalo inapropiado.", "戴绿帽子", "dài lǜ màozi", "ser víctima de una infidelidad", "5", "cultura;regalos;expresion"],

  ["palabra", "familia", "爸爸", "bàba", "papá / padre", "Forma familiar habitual para «padre».", "我爸爸", "wǒ bàba", "mi padre", "7;9;11", "familia"],
  ["palabra", "familia", "妈妈", "māma", "mamá / madre", "Forma familiar habitual para 'madre'.", "我妈妈", "wǒ māma", "mi madre", "7;9", "familia"],
  ["palabra", "familia", "爷爷", "yéye", "abuelo paterno", "Padre del padre.", "我爷爷", "wǒ yéye", "mi abuelo paterno", "7;12", "familia"],
  ["palabra", "familia", "奶奶", "nǎinai", "abuela paterna", "Madre del padre.", "我奶奶", "wǒ nǎinai", "mi abuela paterna", "7;12", "familia"],
  ["palabra", "familia", "外公", "wàigōng", "abuelo materno", "Padre de la madre. El elemento 外 distingue la rama materna.", "外公", "wàigōng", "abuelo materno", "7", "familia"],
  ["palabra", "familia", "外婆", "wàipó", "abuela materna", "Madre de la madre. El elemento 外 distingue la rama materna.", "外婆", "wàipó", "abuela materna", "7", "familia"],
  ["palabra", "gramatica", "的", "de", "de / partícula posesiva o atributiva", "Une el poseedor y lo poseído: A 的 B = «el B de A».", "我的妈妈", "wǒ de māma", "mi madre", "7;11-12", "particula;posesion"],
  ["concepto", "gramatica", "亲属称谓前常省略“的”", "qīnshǔ chēngwèi qián cháng shěnglüè de", "omisión habitual de 的 ante términos de parentesco", "Al hablar de familiares cercanos, suele omitirse 的: 我妈妈 suena más natural que 我的妈妈 en la conversación cotidiana.", "我的妈妈 → 我妈妈", "wǒ de māma → wǒ māma", "mi madre", "7", "posesion;familia"],
  ["frase", "familia", "我的妈妈", "wǒ de māma", "mi madre", "Forma con 的, usada especialmente con contraste o énfasis; en una mención neutra suele decirse 我妈妈.", "这是我的妈妈。", "Zhè shì wǒ de māma.", "Esta es mi madre.", "7;9", "familia;posesion"],
  ["frase", "familia", "我妈妈", "wǒ māma", "mi madre", "Forma habitual que omite 的 por tratarse de una relación cercana.", "我妈妈姓徐。", "Wǒ māma xìng Xú.", "Mi madre se apellida Xu.", "7;9", "familia;posesion"],
  ["palabra", "paises", "中国", "Zhōngguó", "China", "Nombre del país.", "中国", "Zhōngguó", "China", "7", "pais"],
  ["palabra", "paises", "日本", "Rìběn", "Japón", "Nombre del país.", "日本", "Rìběn", "Japón", "7", "pais"],
  ["palabra", "paises", "韩国", "Hánguó", "Corea del Sur", "Nombre habitual de Corea del Sur en mandarín.", "韩国", "Hánguó", "Corea del Sur", "7", "pais"],

  ["palabra", "nombres", "叫", "jiào", "llamarse / llamar", "Se usa para decir el nombre completo o el nombre por el que se conoce a alguien.", "我叫小明。", "Wǒ jiào Xiǎomíng.", "Me llamo Xiaoming.", "8-12", "verbo;presentacion"],
  ["palabra", "nombres", "姓", "xìng", "apellidarse / apellido", "Como verbo, indica el apellido de una persona.", "他姓吴。", "Tā xìng Wú.", "Él se apellida Wu.", "8-14", "verbo;apellido"],
  ["palabra", "nombres", "名字", "míngzi", "nombre", "Se refiere al nombre de una persona; según el contexto puede abarcar el nombre completo.", "你叫什么名字？", "Nǐ jiào shénme míngzi?", "¿Cómo te llamas?", "8-11", "sustantivo;presentacion"],
  ["palabra", "basico", "是", "shì", "ser", "Verbo copulativo usado para identificar o clasificar; no suele conectar un sujeto con un adjetivo simple.", "我是José。", "Wǒ shì José.", "Soy José.", "8-9;14", "verbo;basico"],
  ["concepto", "nombres", "姓＋名", "xìng + míng", "orden de un nombre chino", "En los nombres chinos, el apellido (姓) suele ir antes del nombre de pila (名).", "张欣", "Zhāng Xīn", "Zhang es el apellido y Xin el nombre.", "10-11", "nombre;apellido"],
  ["concepto", "nombres", "姓通常是一个汉字", "xìng tōngcháng shì yí ge hànzì", "el apellido suele tener un carácter", "La mayoría de los apellidos chinos tienen un solo carácter, aunque también existen apellidos compuestos.", "吴、刘、孙", "Wú, Liú, Sūn", "Apellidos de un carácter.", "10-14", "apellido;caracter"],
  ["concepto", "nombres", "名通常由一到两个汉字组成", "míng tōngcháng yóu yí dào liǎng ge hànzì zǔchéng", "el nombre de pila suele constar de uno o dos caracteres", "El nombre de pila suele contener uno o dos caracteres elegidos por su sonido y significado.", "欣／小明", "Xīn / Xiǎomíng", "Ejemplos de nombres de pila de uno y dos caracteres.", "10-12", "nombre;caracter"],
  ["frase", "nombres", "我的名字叫Jan。", "Wǒ de míngzi jiào Jan.", "Me llamo Jan.", "Patrón 我的名字叫 + nombre; en la conversación cotidiana suele bastar con 我叫 + nombre.", "我的名字叫Jan。", "Wǒ de míngzi jiào Jan.", "Me llamo Jan.", "8", "presentacion;patron"],
  ["frase", "nombres", "我叫小明。", "Wǒ jiào Xiǎomíng.", "Me llamo Xiaoming.", "Patrón 我叫 + nombre.", "我叫小明。", "Wǒ jiào Xiǎomíng.", "Me llamo Xiaoming.", "8", "presentacion;patron"],
  ["frase", "nombres", "他姓吴。", "Tā xìng Wú.", "Él se apellida Wu.", "Patrón sujeto + 姓 + apellido.", "他姓吴。", "Tā xìng Wú.", "Él se apellida Wu.", "8", "apellido;patron"],
  ["frase", "presentaciones", "大家好！我叫Dani，很高兴认识大家。", "Dàjiā hǎo! Wǒ jiào Dani, hěn gāoxìng rènshi dàjiā.", "¡Hola a todos! Me llamo Dani. Es un placer conoceros.", "Presentación natural ante un grupo.", "大家好！我叫Dani，很高兴认识大家。", "Dàjiā hǎo! Wǒ jiào Dani, hěn gāoxìng rènshi dàjiā.", "¡Hola a todos! Me llamo Dani. Es un placer conoceros.", "9", "deberes;presentacion"],
  ["frase", "presentaciones", "我姓García，叫Carla。", "Wǒ xìng García, jiào Carla.", "Me apellido García y me llamo Carla.", "Combina 姓 para el apellido y 叫 para el nombre.", "我姓García，叫Carla。", "Wǒ xìng García, jiào Carla.", "Me apellido García y me llamo Carla.", "9", "deberes;apellido;nombre"],
  ["frase", "presentaciones", "大家好！你们最近怎么样？", "Dàjiā hǎo! Nǐmen zuìjìn zěnmeyàng?", "¡Hola a todos! ¿Cómo estáis últimamente?", "Saludo y pregunta natural a varias personas.", "大家好！你们最近怎么样？", "Dàjiā hǎo! Nǐmen zuìjìn zěnmeyàng?", "¡Hola a todos! ¿Cómo estáis últimamente?", "9", "deberes;saludo"],
  ["frase", "presentaciones", "你好，我是José，她是Fátima。", "Nǐ hǎo, wǒ shì José, tā shì Fátima.", "Hola, soy José y ella es Fátima.", "Presenta al hablante y a otra persona.", "你好，我是José，她是Fátima。", "Nǐ hǎo, wǒ shì José, tā shì Fátima.", "Hola, soy José y ella es Fátima.", "9", "deberes;presentacion"],
  ["frase", "presentaciones", "你好，我叫Manuel，我爸爸叫Pablo。", "Nǐ hǎo, wǒ jiào Manuel, wǒ bàba jiào Pablo.", "Hola, me llamo Manuel y mi padre se llama Pablo.", "Ejemplo natural de presentación personal y familiar.", "你好，我叫Manuel，我爸爸叫Pablo。", "Nǐ hǎo, wǒ jiào Manuel, wǒ bàba jiào Pablo.", "Hola, me llamo Manuel y mi padre se llama Pablo.", "9", "deberes;familia"],
  ["frase", "presentaciones", "我妈妈姓徐，我姓刘。", "Wǒ māma xìng Xú, wǒ xìng Liú.", "Mi madre se apellida Xu y yo me apellido Liu.", "Ejemplo que contrasta dos apellidos familiares.", "我妈妈姓徐，我姓刘。", "Wǒ māma xìng Xú, wǒ xìng Liú.", "Mi madre se apellida Xu y yo me apellido Liu.", "9", "deberes;familia;apellido"],
  ["palabra", "nombres", "陆", "lù / Lù", "tierra firme / apellido Lu", "陆 significa «tierra firme» frente al agua; también se usa como apellido.", "陆", "Lù", "apellido Lu", "11", "caracter;apellido"],
  ["frase", "presentaciones", "你好，我叫张欣。", "Nǐ hǎo, wǒ jiào Zhāng Xīn.", "Hola, me llamo Zhang Xin.", "Ejemplo de nombre chino con el apellido antes del nombre.", "你好，我叫张欣。", "Nǐ hǎo, wǒ jiào Zhāng Xīn.", "Hola, me llamo Zhang Xin.", "11", "presentacion;nombre"],
  ["frase", "familia", "我爸爸姓刘。", "Wǒ bàba xìng Liú.", "Mi padre se apellida Liu.", "Patrón familiar natural sin 的 + 姓 + apellido.", "我爸爸姓刘。", "Wǒ bàba xìng Liú.", "Mi padre se apellida Liu.", "11", "familia;apellido"],

  ["palabra", "preguntas", "什么", "shénme", "qué", "Interrogativo para preguntar «qué», «cuál» o «qué tipo»; ocupa en la frase el lugar de la información desconocida.", "你叫什么名字？", "Nǐ jiào shénme míngzi?", "¿Cómo te llamas?", "11-12", "interrogativo;pregunta_abierta"],
  ["palabra", "preguntas", "谁", "shuí / shéi", "quién", "Interrogativo para personas; ambas pronunciaciones son habituales.", "谁叫王泽？", "Shéi jiào Wáng Zé?", "¿Quién se llama Wang Ze?", "11-14", "interrogativo;pregunta_abierta"],
  ["concepto", "preguntas", "疑问词原位", "yíwèncí yuánwèi", "el interrogativo ocupa la posición de la respuesta", "En preguntas abiertas, 什么 o 谁 sustituye exactamente la información desconocida sin cambiar el orden básico de la frase.", "我爸爸叫张华。→ 谁叫张华？", "Wǒ bàba jiào Zhāng Huá. → Shéi jiào Zhāng Huá?", "Mi padre se llama Zhang Hua. → ¿Quién se llama Zhang Hua?", "11", "gramatica;pregunta_abierta"],
  ["frase", "preguntas", "我爸爸叫张华。", "Wǒ bàba jiào Zhāng Huá.", "Mi padre se llama Zhang Hua.", "Oración afirmativa que sirve como base para dos preguntas abiertas.", "我爸爸叫什么名字？", "Wǒ bàba jiào shénme míngzi?", "¿Cómo se llama mi padre?", "11", "familia;nombre"],
  ["frase", "preguntas", "谁叫张华？", "Shéi jiào Zhāng Huá?", "¿Quién se llama Zhang Hua?", "谁 reemplaza a la persona desconocida que ocupa la posición de sujeto.", "我爸爸叫张华。", "Wǒ bàba jiào Zhāng Huá.", "Mi padre se llama Zhang Hua.", "11", "interrogativo;quien"],
  ["frase", "preguntas", "我爸爸叫什么名字？", "Wǒ bàba jiào shénme míngzi?", "¿Cómo se llama mi padre?", "什么名字 sustituye el nombre desconocido después de 叫.", "我爸爸叫张华。", "Wǒ bàba jiào Zhāng Huá.", "Mi padre se llama Zhang Hua.", "11", "interrogativo;que"],
  ["frase", "preguntas", "这是他的名字。", "Zhè shì tā de míngzi.", "Este es su nombre.", "Oración afirmativa con posesión y 名字.", "这是谁的名字？", "Zhè shì shéi de míngzi?", "¿De quién es este nombre?", "11", "posesion;nombre"],
  ["frase", "preguntas", "这是谁的名字？", "Zhè shì shéi de míngzi?", "¿De quién es este nombre?", "谁的 significa «de quién» o «cuyo».", "这是他的名字。", "Zhè shì tā de míngzi.", "Este es su nombre.", "11", "interrogativo;posesion"],
  ["frase", "preguntas", "我奶奶姓沈。", "Wǒ nǎinai xìng Shěn.", "Mi abuela paterna se apellida Shen.", "Afirmación usada como base de una pregunta con 什么.", "我奶奶姓什么？", "Wǒ nǎinai xìng shénme?", "¿Cómo se apellida mi abuela paterna?", "12", "familia;apellido"],
  ["frase", "preguntas", "我奶奶姓什么？", "Wǒ nǎinai xìng shénme?", "¿Cómo se apellida mi abuela paterna?", "什么 sustituye el apellido desconocido.", "我奶奶姓沈。", "Wǒ nǎinai xìng Shěn.", "Mi abuela paterna se apellida Shen.", "12", "interrogativo;apellido"],
  ["frase", "preguntas", "你爷爷叫王泽。", "Nǐ yéye jiào Wáng Zé.", "Tu abuelo paterno se llama Wang Ze.", "Afirmación usada como base de una pregunta con 谁.", "谁叫王泽？", "Shéi jiào Wáng Zé?", "¿Quién se llama Wang Ze?", "12", "familia;nombre"],
  ["frase", "preguntas", "谁叫王泽？", "Shéi jiào Wáng Zé?", "¿Quién se llama Wang Ze?", "谁 reemplaza al sujeto desconocido.", "你爷爷叫王泽。", "Nǐ yéye jiào Wáng Zé.", "Tu abuelo paterno se llama Wang Ze.", "12", "interrogativo;quien"],
  ["frase", "preguntas", "请问，您叫什么名字？", "Qǐngwèn, nín jiào shénme míngzi?", "Disculpe, ¿cómo se llama usted?", "Pregunta cortés por el nombre, con 请问 y 您.", "我叫Dani。", "Wǒ jiào Dani.", "Me llamo Dani.", "12", "formal;nombre"],
  ["frase", "preguntas", "请问，谁叫王强？", "Qǐngwèn, shéi jiào Wáng Qiáng?", "Perdonad, ¿quién se llama Wang Qiang?", "Pregunta cortés, dirigida a un grupo, por la persona que tiene ese nombre.", "我叫王强。", "Wǒ jiào Wáng Qiáng.", "Me llamo Wang Qiang.", "12", "interrogativo;nombre"],
  ["frase", "preguntas", "我爷爷叫王强。", "Wǒ yéye jiào Wáng Qiáng.", "Mi abuelo paterno se llama Wang Qiang.", "Afirmación sobre el nombre del abuelo paterno.", "你爷爷叫什么名字？", "Nǐ yéye jiào shénme míngzi?", "¿Cómo se llama tu abuelo paterno?", "12", "familia;nombre"],

  ["palabra", "tiempo", "上", "shàng", "arriba / encima / anterior", "Componente de 上午 y 早上.", "上午", "shàngwǔ", "por la mañana", "13", "direccion;caracter"],
  ["palabra", "tiempo", "下", "xià", "abajo / debajo / siguiente", "Componente de 下午.", "下午", "xiàwǔ", "por la tarde", "13", "direccion;caracter"],
  ["palabra", "tiempo", "午", "wǔ", "mediodía", "Componente que aparece en 上午, 中午 y 下午.", "中午", "zhōngwǔ", "al mediodía", "13", "tiempo;caracter"],
  ["palabra", "tiempo", "早上", "zǎoshang", "por la mañana", "Periodo de la mañana, normalmente desde que uno se levanta hasta antes del mediodía; no tiene límites horarios exactos.", "早上好！", "Zǎoshang hǎo!", "¡Buenos días!", "13-14", "tiempo;saludo"],
  ["palabra", "tiempo", "上午", "shàngwǔ", "por la mañana", "Periodo anterior al mediodía.", "我上午有课。", "Wǒ shàngwǔ yǒu kè.", "Tengo clase por la mañana.", "13", "tiempo"],
  ["palabra", "tiempo", "中午", "zhōngwǔ", "al mediodía", "Periodo alrededor del mediodía; no tiene límites horarios exactos.", "我们中午见。", "Wǒmen zhōngwǔ jiàn.", "Nos vemos al mediodía.", "13", "tiempo"],
  ["palabra", "tiempo", "下午", "xiàwǔ", "por la tarde", "Periodo posterior al mediodía y anterior a la noche; no tiene límites horarios exactos.", "下午好！", "Xiàwǔ hǎo!", "¡Buenas tardes!", "13", "tiempo;saludo"],
  ["palabra", "tiempo", "晚上", "wǎnshang", "por la noche", "Periodo desde el anochecer hasta antes de dormir; no tiene límites horarios exactos.", "晚上好！", "Wǎnshang hǎo!", "¡Buenas noches!", "13-14", "tiempo;saludo"],
  ["palabra", "tiempo", "凌晨", "língchén", "de madrugada", "Periodo entre la medianoche y el amanecer; no tiene límites horarios exactos.", "凌晨", "língchén", "de madrugada", "13", "tiempo"],
  ["concepto", "saludos", "时间段＋好", "shíjiānduàn + hǎo", "parte del día + 好", "Algunas expresiones temporales forman saludos establecidos con 好, sobre todo 早上好, 下午好 y 晚上好; 上午好 y 中午好 son posibles, pero menos habituales.", "下午好！", "Xiàwǔ hǎo!", "¡Buenas tardes!", "13", "patron;saludo"],
  ["frase", "saludos", "早上好！", "Zǎoshang hǎo!", "¡Buenos días!", "Saludo explícito de la mañana.", "早上好，我是王芳。", "Zǎoshang hǎo, wǒ shì Wáng Fāng.", "Buenos días, soy Wang Fang.", "13-14", "saludo;manana"],
  ["frase", "saludos", "下午好！", "Xiàwǔ hǎo!", "¡Buenas tardes!", "Saludo explícito de la tarde.", "下午好！", "Xiàwǔ hǎo!", "¡Buenas tardes!", "13", "saludo;tarde"],
  ["frase", "saludos", "早安！", "Zǎo'ān!", "¡Buenos días!", "Saludo breve especialmente habitual en Taiwán y en mensajes escritos; en la conversación cotidiana de la China continental suele preferirse 早上好.", "早安！", "Zǎo'ān!", "¡Buenos días!", "13-14", "saludo;manana"],
  ["frase", "saludos", "午安！", "Wǔ'ān!", "¡Buenas tardes!", "Saludo regional o formal alrededor del mediodía o por la tarde; es poco habitual en gran parte de la China continental.", "午安！", "Wǔ'ān!", "¡Buenas tardes!", "13", "saludo;tarde"],
  ["frase", "saludos", "晚安！", "Wǎn'ān!", "¡Buenas noches!", "Se usa principalmente al despedirse por la noche o antes de dormir, no como saludo inicial general.", "晚安！", "Wǎn'ān!", "¡Buenas noches!", "13", "saludo;despedida"],
  ["frase", "saludos", "再见！", "Zàijiàn!", "¡Adiós! / ¡Hasta luego!", "Despedida estándar.", "再见！", "Zàijiàn!", "¡Hasta luego!", "14", "despedida"],
  ["frase", "saludos", "拜拜！", "Bàibài!", "¡Chao! / ¡Adiós!", "Despedida informal tomada del inglés 'bye-bye'.", "拜拜！", "Bàibài!", "¡Chao!", "14", "despedida;informal"],
  ["frase", "presentaciones", "晚上好，请问您贵姓？", "Wǎnshang hǎo, qǐngwèn nín guìxìng?", "Buenas noches. Disculpe, ¿cuál es su apellido?", "Saludo nocturno seguido de la fórmula cortés 请问您贵姓 para preguntar el apellido.", "我姓孙。", "Wǒ xìng Sūn.", "Me apellido Sun.", "14", "dictado;formal;apellido"],
  ["frase", "presentaciones", "我姓孙。", "Wǒ xìng Sūn.", "Me apellido Sun.", "Respuesta con el patrón 我姓 + apellido.", "请问您贵姓？", "Qǐngwèn nín guìxìng?", "Disculpe, ¿cuál es su apellido?", "14", "dictado;apellido"],
  ["frase", "presentaciones", "早上好，请问谁是王芳？", "Zǎoshang hǎo, qǐngwèn shéi shì Wáng Fāng?", "Buenos días. Disculpe, ¿quién es Wang Fang?", "Saludo matutino seguido de una pregunta cortés de identificación.", "早上好，我是王芳。", "Zǎoshang hǎo, wǒ shì Wáng Fāng.", "Buenos días, soy Wang Fang.", "14", "dictado;identificacion"],
  ["frase", "presentaciones", "早上好，我是王芳。", "Zǎoshang hǎo, wǒ shì Wáng Fāng.", "Buenos días, soy Wang Fang.", "Respuesta de identificación con 我是 + nombre.", "谁是王芳？", "Shéi shì Wáng Fāng?", "¿Quién es Wang Fang?", "14", "dictado;presentacion"],
  ["palabra", "bebidas", "奶", "nǎi", "leche / lácteo (como componente)", "Puede significar «leche» y aparece en compuestos como 奶茶; para la leche de vaca que se bebe se dice normalmente 牛奶.", "奶茶", "nǎichá", "té con leche", "14", "bebida;ingrediente"],
  ["palabra", "bebidas", "茶", "chá", "té", "Sustantivo y componente de 奶茶 y 珍珠奶茶.", "奶茶", "nǎichá", "té con leche", "14", "bebida;ingrediente"],
  ["palabra", "bebidas", "珍珠", "zhēnzhū", "perla", "En 珍珠奶茶 se refiere a las bolitas de tapioca, similares a perlas.", "珍珠奶茶", "zhēnzhū nǎichá", "té con leche y perlas de tapioca", "14", "bebida;ingrediente"],
  ["palabra", "bebidas", "珍珠奶茶", "zhēnzhū nǎichá", "té de burbujas / té con leche y tapioca", "Literalmente «té con leche de perlas».", "我喜欢珍珠奶茶。", "Wǒ xǐhuan zhēnzhū nǎichá.", "Me gusta el té de burbujas.", "14", "bebida"],

  ["concepto", "pronunciacion", "拼音", "pīnyīn", "pinyin", "Sistema de transcripción del mandarín con letras latinas y marcas de tono.", "nǐ hǎo", "nǐ hǎo", "hola", "15", "pronunciacion;escritura"],
  ["concepto", "pronunciacion", "声调", "shēngdiào", "tonos", "Cada sílaba del mandarín tiene un tono léxico o tono neutro; el tono puede cambiar el significado.", "mā / má / mǎ / mà / ma", "mā / má / mǎ / mà / ma", "los cuatro tonos léxicos y el tono neutro, ilustrados con ma", "15", "pronunciacion;tono"],
  ["concepto", "pronunciacion", "声调符号标在元音上", "shēngdiào fúhào biāo zài yuányīn shàng", "la marca tonal va sobre una vocal", "Las consonantes nunca llevan la marca de tono en pinyin.", "nǐ", "nǐ", "La marca está sobre la vocal i.", "15", "pinyin;tono;regla"],
  ["concepto", "pronunciacion", "标调优先顺序：a、o、e", "biāodiào yōuxiān shùnxù: a, o, e", "prioridad para colocar el tono: a, o, e", "Si una sílaba contiene «a», la marca va sobre esa vocal; en caso contrario, se da prioridad a «o» y «e» antes que a las demás.", "hǎo", "hǎo", "En ao, la marca va sobre a.", "15", "pinyin;tono;regla"],
  ["concepto", "pronunciacion", "iu／ui 标在后一个元音上", "iu / ui biāo zài hòu yí ge yuányīn shàng", "en iu y ui, el tono va en la segunda vocal", "Excepción práctica de colocación: liú y guǐ llevan la marca en la segunda letra del grupo vocálico.", "留／鬼", "liú / guǐ", "quedarse / fantasma", "15", "pinyin;tono;regla"],
  ["concepto", "pronunciacion", "每个音节最多一个声调符号", "měi ge yīnjié zuìduō yí ge shēngdiào fúhào", "máximo una marca tonal por sílaba", "Aunque una sílaba tenga varias vocales, solo una recibe la marca tonal.", "怎么样", "zěnmeyàng", "qué tal / cómo", "15", "pinyin;tono;regla"],
  ["concepto", "pronunciacion", "j、q、x 后的 ü 省略两点；零声母时写作 yu", "j, q, x hòu de ü shěnglüè liǎng diǎn; líng shēngmǔ shí xiězuò yu", "tras j, q o x, ü se escribe u; sin consonante inicial se escribe yu", "Se escribe ju, qu, xu y yu, aunque la vocal se pronuncia como ü. Tras n o l se conservan los puntos: nǚ, lǜ.", "女 → nǚ；去 → qù；雨 → yǔ", "nǚ; qù; yǔ", "mujer; ir; lluvia", "15", "pinyin;u_dieresis;regla"],

  ["frase", "basico", "加油！", "Jiāyóu!", "¡Ánimo! / ¡Vamos!", "Expresión muy frecuente para animar a alguien o mostrar apoyo; según el contexto también puede equivaler a «¡Tú puedes!».", "大家加油！", "Dàjiā jiāyóu!", "¡Ánimo a todos!", "—", "animo;expresion;basico"],
  ["palabra", "preguntas", "什么时候", "shénme shíhou", "cuándo", "Interrogativo para preguntar en qué momento ocurre algo; ocupa la posición de la expresión temporal.", "你什么时候洗澡？", "Nǐ shénme shíhou xǐzǎo?", "¿Cuándo te duchas?", "—", "interrogativo;tiempo;pregunta_abierta"],
  ["palabra", "acciones", "跑步", "pǎobù", "correr / salir a correr", "Verbo habitual para hablar de correr como actividad o ejercicio; 跑 significa «correr» de forma más general.", "我每天早上跑步。", "Wǒ měitiān zǎoshang pǎobù.", "Corro todas las mañanas.", "—", "verbo;actividad;rutina"],
  ["palabra", "acciones", "洗澡", "xǐzǎo", "ducharse / bañarse", "Expresión cotidiana para lavarse el cuerpo; según el contexto puede significar «ducharse» o «bañarse».", "我晚上洗澡。", "Wǒ wǎnshang xǐzǎo.", "Me ducho por la noche.", "—", "verbo;higiene;rutina"],
  ["frase", "bebidas", "喝牛奶", "hē niúnǎi", "beber leche", "喝 significa «beber» y 牛奶 es la forma habitual de decir «leche».", "我每天早上喝牛奶。", "Wǒ měitiān zǎoshang hē niúnǎi.", "Bebo leche todas las mañanas.", "—", "bebida;verbo;rutina"],
];

const header = [
  "id",
  "tipo",
  "tema",
  "hanzi",
  "pinyin",
  "espanol",
  "explicacion",
  "ejemplo_hanzi",
  "ejemplo_pinyin",
  "ejemplo_espanol",
  "pagina",
  "etiquetas",
];

for (const [index, row] of rows.entries()) {
  if (row.length !== header.length - 1) {
    throw new Error(`Fila ${index + 1}: se esperaban ${header.length - 1} campos y hay ${row.length}`);
  }
}

// Progress is stored against these positional IDs. Existing identities must
// stay in place; new cards may be appended without changing saved progress.
try {
  const currentCsv = await fs.readFile(outputPath, "utf8");
  const current = Papa.parse(currentCsv, { header: true, skipEmptyLines: true });
  if (current.errors.length > 0) {
    throw new Error(`No se pudo validar el CSV actual: ${current.errors[0].message}`);
  }
  if (current.data.length > rows.length) {
    throw new Error(
      "No se pueden eliminar tarjetas sin una migración explícita de los IDs guardados.",
    );
  }
  current.data.forEach((card, index) => {
    const expectedId = `FC${String(index + 1).padStart(3, "0")}`;
    const nextRow = rows[index];
    const [, , nextHanzi, nextPinyin] = nextRow;
    if (card.id !== expectedId || card.hanzi !== nextHanzi || card.pinyin !== nextPinyin) {
      throw new Error(
        `${expectedId} ha cambiado de identidad. Conserva el orden existente y añade tarjetas solo al final.`,
      );
    }
  });
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const escapeCsv = (value) => {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const lines = [header, ...rows.map((row, index) => [`FC${String(index + 1).padStart(3, "0")}`, ...row])]
  .map((row) => row.map(escapeCsv).join(","));

await fs.writeFile(outputPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Escritas ${rows.length} tarjetas en ${outputPath.pathname}`);
