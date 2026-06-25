export type WhoKey = "epc_cl" | "lo_cl" | "lo_epc" | "epc_lo" | "lo_3";

export type Who = { label: string; arrow: string; target: string; tone: "epc" | "lo_cl" | "lo_epc" };

export const WHO: Record<WhoKey, Who> = {
  epc_cl: { label: "EPC",      arrow: "→", target: "cliente en sitio",                tone: "epc" },
  lo_cl:  { label: "Live Ops", arrow: "→", target: "cliente (llamada)",               tone: "lo_cl" },
  lo_epc: { label: "Live Ops", arrow: "→", target: "EPC",                             tone: "lo_epc" },
  epc_lo: { label: "EPC",      arrow: "→", target: "Live Ops",                        tone: "epc" },
  lo_3:   { label: "Live Ops", arrow: "→", target: "cliente + corporativo + arrendador", tone: "lo_cl" },
};

export type Speech = { who: WhoKey; title: string; text: string; note?: string };
export type Special = { title: string; speeches: Speech[] };
export type BlockerKind = "warn" | "stop";
export type Blocker = {
  kind: BlockerKind;
  label: string;
  sub: string;
  speeches: Speech[];
  chain?: string[];
  escalate?: boolean;
  escalateText?: string;
};
export type Hito = {
  id: string;
  code: string;
  label: string;
  phase: string;
  phaseColor: string;
  title: string;
  sub: string;
  objetivo: string;
  criterios: string[];
  specials?: Special[];
  blockers: Blocker[];
};

export const HITOS: Hito[] = [
{
  id:"h0",code:"H0",label:"Documental",phase:"Preparación",phaseColor:"#5DCAA5",
  title:"Control documental",
  sub:"3–5 días antes · Live Ops verifica con EPC",
  objetivo:"El EPC tiene todo lo necesario para movilizarse.",
  criterios:["Sembrado, unifilar y despiece confirmados","Material en sitio coincide con la OV","Manuales de instalación disponibles","Fecha y hora de llegada coordinadas"],
  specials:[
    { title:"Autorización de movilización", speeches:[
      { who:"lo_epc", title:"Confirmación de paquete completo",
        text:"\"[Nombre], revisé tu paquete completo. Sembrado, unifilar, despiece, materiales y manuales: todo confirmado. Quedas autorizado para movilizarte el [fecha]. Cualquier duda en sitio, me marcas.\"" }
    ]}
  ],
  blockers:[
    { kind:"warn", label:"Discrepancia documental", sub:"Documento incorrecto o alcance ambiguo", speeches:[
        { who:"lo_epc", title:"Detener autorización hasta resolver",
          text:"\"Antes de autorizarte: el [documento X] no coincide con la OV. ¿Tienes versión actualizada? Si no, lo escalo a ingeniería y te confirmo hoy.\"" },
        { who:"lo_epc", title:"Objeción — 'ya revisé todo'",
          text:"\"Lo sé. El tema es que mi versión no cuadra con la OV. No es tu error — es del proceso. Necesitamos que los dos documentos coincidan antes de que salgas.\"" }
      ], chain:["EPC","Live Ops","Ingeniería"], escalate:false },
    { kind:"warn", label:"Despiece o unifilar modificado después de ser compartido al EPC", sub:"Versión vigente difiere de la que tiene el EPC", speeches:[
        { who:"lo_epc", title:"Detener movilización — versión no vigente",
          text:"\"El documento que tienes no es la versión vigente. No te movilices hasta que te confirme la versión final.\"" },
        { who:"lo_epc", title:"Reautorizar con versión actualizada",
          text:"\"Ya tengo la versión final de ingeniería. Te la comparto ahora — revísala y confírmame que la tienes para autorizarte movilización.\"" }
      ], chain:["Live Ops","Ingeniería","EPC recibe versión actualizada","Live Ops autoriza movilización"], escalate:false },
    { kind:"stop", label:"Material no corresponde a la OV", sub:"Material físico distinto a la orden de venta", speeches:[
        { who:"lo_epc", title:"Paro de movilización",
          text:"\"Detenemos la movilización. El material no coincide con la OV. No se improvisa en campo. Escalo a Planning — te confirmo hoy.\"" }
      ], chain:["Live Ops","Planning — Vo.Bo. requerido"], escalate:true,
      escalateText:"EPC no se moviliza hasta recibir Vo.Bo. escrito de Planning. Documentar foto de material vs. OV." }
  ]
},
{
  id:"h1",code:"H1",label:"Llegada",phase:"Preparación",phaseColor:"#5DCAA5",
  title:"Llegada a sitio y evaluación de techo",
  sub:"Día 1 · Primer contacto + corte de luz + evaluación",
  objetivo:"Contacto establecido, corte de luz coordinado y techo evaluado y aceptado.",
  criterios:["Nombre y número del responsable registrados en ticket","Corte de luz acordado (hora y modalidad)","Acta de techo firmada y subida a SCOOP","Fotos del techo subidas a SCOOP"],
  specials:[
    { title:"Primer contacto — obtener nombre y número", speeches:[
      { who:"epc_cl", title:"Presentación en sitio",
        text:"\"Buenos días, vengo de NIKO para la instalación solar de hoy. ¿Con quién tengo el gusto? Necesito presentarme con quien va a coordinar con nosotros.\"",
        note:"Registrar inmediatamente en ticket: nombre completo + número directo." },
      { who:"lo_cl", title:"Presentación remota desde Live Ops",
        text:"\"Buenos días, ¿hablo con [Nombre]? Le contacta [Agente] de NIKO. Nuestro equipo ya está en su establecimiento. Voy a ser su punto de contacto directo todo el día — si necesita algo, me marca a mí.\"" },
      { who:"lo_cl", title:"Cliente hostil — 'tú deberías saber'",
        text:"\"Tiene razón, la autorización ya existe — por eso estamos aquí. Solo necesito coordinar los detalles del día con usted para no interrumpir su operación. Si prefiere, le pido a [BDR / líder de zona] que le confirme directamente.\"",
        note:"Zona de riesgo: Live Ops no obliga al EPC a permanecer. Escala a Planning de inmediato." }
    ]},
    { title:"Corte de luz — coordinar antes de las 11am", speeches:[
      { who:"lo_cl", title:"A · Corte temprano (ideal)",
        text:"\"Necesitamos un corte de luz breve para los trabajos eléctricos. La ventana ideal es antes de las 11am para no afectar su operación. ¿Lo confirmamos para [hora]? El corte dura aproximadamente [X] minutos.\"" },
      { who:"lo_cl", title:"B · Fuera de la ventana ideal",
        text:"\"Entendemos que antes de las 11 no es posible. Dígame qué ventana le afecta menos — muy temprano antes de apertura o al cierre. Nos ajustamos a su operación.\"" },
      { who:"lo_cl", title:"C · Sin autorización de corte",
        text:"\"Si no es posible el corte hoy, contamos con planta de luz para soportar los trabajos sin interrumpir su operación.\"",
        note:"Costo de planta: pendiente definición con Eliel / Planning antes de ofrecerla." }
    ]}
  ],
  blockers:[
    { kind:"warn", label:"Daño preexistente en zona no crítica", sub:"Humedad localizada, impermeabilizante desgastado", speeches:[
        { who:"epc_cl", title:"Solicitar firma del acta",
          text:"\"Encontramos una condición preexistente en su techo. Necesito mostrarle y pedirle su firma — esto nos protege a los dos.\"" },
        { who:"lo_cl", title:"Explicación desde Live Ops",
          text:"\"Detectamos una condición en su techo que existía antes de nuestra llegada. La documentamos y le pedimos su firma de conformidad. Es un trámite rápido.\"" },
        { who:"lo_cl", title:"Objeción — 'no voy a firmar'",
          text:"\"La firma no implica ningún costo — solo documenta el estado actual de su techo antes de que toquemos algo. Si no la tenemos, no podemos continuar los trabajos.\"" }
      ], chain:["EPC","Live Ops","Ingeniería confirma"], escalate:false },
    { kind:"stop", label:"Daño estructural crítico", sub:"Losa comprometida, asbesto, lámina calibre ≤28", speeches:[
        { who:"epc_lo", title:"Activar paro de obra",
          text:"\"Paro de obra. Condición crítica: [descripción]. Enviando evidencias ahora.\"" },
        { who:"lo_cl", title:"Comunicar al cliente",
          text:"\"Por seguridad de su propiedad y de nuestro equipo, detenemos los trabajos. Ingeniería evalúa antes de continuar. Le contactamos hoy mismo con opciones.\"" }
      ], chain:["EPC","Live Ops","Planning — paro oficial"], escalate:true,
      escalateText:"Fotos a ingeniería estructural. Sin Vo.Bo. escrito, no se reanuda." },
    { kind:"stop", label:"Cliente se niega a firmar el acta", sub:"Negativa explícita de firma", speeches:[
        { who:"lo_cl", title:"Último intento de persuasión",
          text:"\"Sin la firma no podemos continuar — es un requisito de protocolo que protege tanto a usted como a nosotros. Si hay algo del documento que no le quede claro, lo revisamos ahora mismo.\"" }
      ], chain:["Live Ops","Gerencia Comercial / Legal"], escalate:true,
      escalateText:"NO rotundo. La empresa absorbe responsabilidad legal sin la firma. Escalar a Legal/Comercial antes de cualquier trabajo." },
    { kind:"warn", label:"Falta material en bodega antes de salir a campo", sub:"Verificación de logística pendiente (monitor, paneles, microinversores o estructura)", speeches:[
        { who:"lo_epc", title:"Paro preventivo de movilización",
          text:"\"Falta [material] en bodega. No autorizo movilización hasta confirmar recepción.\"" },
        { who:"lo_cl", title:"Comunicar al cliente",
          text:"\"Estamos confirmando la recepción de un material en bodega antes de salir. Le confirmamos hora de arranque hoy mismo.\"" }
      ], chain:["Live Ops","Planeación / Logística"], escalate:false },
    { kind:"stop", label:"Acometida subterránea no identificada en el levantamiento", sub:"Requiere rediseño de ruta eléctrica", speeches:[
        { who:"epc_lo", title:"Reportar condición no contemplada",
          text:"\"Hay una acometida subterránea no identificada en el levantamiento. No puedo avanzar sin rediseño de ruta eléctrica.\"" },
        { who:"lo_cl", title:"Comunicar al cliente",
          text:"\"Identificamos una condición no contemplada en el diseño original. Nuestro equipo de ingeniería define la solución — le confirmamos hoy.\"" }
      ], chain:["EPC","Live Ops","Ingeniería (cambio de diseño)","Planeación si genera costo adicional"], escalate:true,
      escalateText:"Ingeniería redefine la ruta eléctrica. Si el cambio genera costo adicional, Planeación autoriza antes de retomar." },
    { kind:"stop", label:"Obstáculo físico que interfiere con el diseño aprobado", sub:"Imposible ejecutar el diseño tal como está", speeches:[
        { who:"epc_lo", title:"Solicitar rediseño",
          text:"\"Hay un obstáculo físico que impide ejecutar el diseño aprobado: [descripción]. Necesito rediseño antes de continuar.\"" },
        { who:"lo_cl", title:"Comunicar al cliente",
          text:"\"Detectamos una condición en sitio que requiere ajuste de diseño. Ingeniería lo resuelve hoy y le confirmamos siguiente paso.\"" }
      ], chain:["EPC","Live Ops","Ingeniería","Planeación si cambia alcance"], escalate:true,
      escalateText:"Ingeniería entrega rediseño. Si cambia alcance o costo, Planeación autoriza antes de continuar." },
    { kind:"warn", label:"Materiales entregados tardíamente por NIKO", sub:"EPC permanece en sitio — tiempo de espera activo", speeches:[
        { who:"lo_epc", title:"Mantener equipo en sitio",
          text:"\"El material llega a [hora estimada]. Permanece en sitio — se cuenta como tiempo de espera activo.\"" },
        { who:"lo_cl", title:"Comunicar al cliente",
          text:"\"Estamos coordinando la entrega de un material. Nuestro equipo permanece en sitio y retoma en cuanto llegue.\"" }
      ], chain:["Live Ops","Planeación — confirmar hora de entrega","EPC espera"], escalate:false }
  ]
},
{
  id:"h2",code:"H2",label:"Seguridad",phase:"Instalación",phaseColor:"#EF9F27",
  title:"Preparación y seguridad",
  sub:"Antes de cualquier perforación o maniobra en techo",
  objetivo:"El equipo puede subir al techo de forma segura.",
  criterios:["EPP completo: casco, botas, guantes, gafas","Líneas de vida y arneses instalados","Área perimetral delimitada","Mínimo 4 técnicos (2 oficiales + 2 ayudantes)","Tablones de apoyo en techo de lámina o fibrocemento"],
  specials:[],
  blockers:[
    { kind:"stop", label:"EPP incompleto, sin líneas de vida o personal insuficiente", sub:"Nadie sube al techo bajo ningún motivo", speeches:[
        { who:"epc_lo", title:"Reportar a Live Ops",
          text:"\"No podemos iniciar. Falta [EPP / líneas de vida / mínimo 4 técnicos]. Necesito instrucciones.\"" },
        { who:"lo_cl", title:"Comunicar al cliente",
          text:"\"Por protocolo de seguridad hacemos un ajuste antes de iniciar. Le confirmamos nueva hora de arranque en minutos.\"" }
      ], chain:["EPC","Live Ops","Planning — reposición urgente"], escalate:true,
      escalateText:"Nadie sube al techo. Planning gestiona reposición de EPP o personal. Sin resolución: reprogramar." }
  ]
},
{
  id:"h3",code:"H3",label:"Anclajes",phase:"Instalación",phaseColor:"#EF9F27",
  title:"Anclajes y método de fijación",
  sub:"Validar antes de completar estructura",
  objetivo:"Los primeros anclajes cumplen el protocolo y pueden soportar el sistema.",
  criterios:["Mínimo 5 anclajes documentados con foto","Torque conforme al manual","Sellado correcto en cada punto","Evidencia subida a SCOOP antes de continuar"],
  specials:[],
  blockers:[
    { kind:"warn", label:"Sellado incompleto o torque no verificado", sub:"Corrección posible en campo", speeches:[
        { who:"lo_epc", title:"Solicitar corrección y reevidencia",
          text:"\"Las evidencias muestran [observación]. Corrige [punto] y mándame evidencia de 2 anclajes antes de continuar.\"" },
        { who:"lo_epc", title:"Objeción — 'así lo hacemos siempre'",
          text:"\"Puede que funcione, pero si no está en el manual y hay un incidente, la garantía no cubre — y eso te afecta a ti también. Corrígelo y seguimos.\"" }
      ], chain:["EPC corrige","Live Ops valida","Ingeniería si persiste"], escalate:false },
    { kind:"stop", label:"Incumplimiento total del protocolo de anclaje", sub:"No continuar hasta Vo.Bo. de ingeniería", speeches:[
        { who:"lo_epc", title:"Paro — esperar instrucciones",
          text:"\"Paro. Los anclajes no cumplen el protocolo. No continúes — espera instrucciones de ingeniería.\"" },
        { who:"lo_cl", title:"Comunicar al cliente",
          text:"\"Vamos a hacer una pausa técnica para revisar el método con ingeniería. Le informamos en [X] horas.\"" }
      ], chain:["Live Ops","Ingeniería","Planning"], escalate:true,
      escalateText:"Ingeniería evalúa. Planning decide si se retrabaja en sitio o se reprograma." },
    { kind:"warn", label:"Falta cinta Alusticker u otro material de sellado", sub:"Material consumible faltante en sitio", speeches:[
        { who:"lo_epc", title:"Buscar localmente o escalar",
          text:"\"¿Es posible conseguirlo localmente hoy? Si sí, autorizo continuar en cuanto lo tengas. Si no, paro y escalo a Planeación para envío urgente.\"" }
      ], chain:["EPC consigue en campo","Live Ops valida / si no consigue","Planeación — envío urgente"], escalate:false },
    { kind:"stop", label:"Material o espesor real de la losa no corresponde al levantamiento", sub:"Método de fijación aprobado no aplica", speeches:[
        { who:"epc_lo", title:"Reportar condición no contemplada",
          text:"\"La losa es [material/espesor real] — no coincide con el levantamiento. El método de fijación aprobado no aplica.\"" },
        { who:"lo_cl", title:"Comunicar al cliente",
          text:"\"Detectamos una condición estructural que requiere ajuste de método. Ingeniería lo resuelve y le confirmamos siguiente paso.\"" }
      ], chain:["EPC","Live Ops","Ingeniería (cambio de diseño)","Planeación si cambia costo"], escalate:true,
      escalateText:"Ingeniería redefine método de fijación. Planeación autoriza si cambia costo o alcance." }
  ]
},
{
  id:"h4",code:"H4",label:"Estructura",phase:"Instalación",phaseColor:"#EF9F27",
  title:"Estructura completa",
  sub:"Validar antes de montar módulos",
  objetivo:"La estructura está lista para recibir los módulos.",
  criterios:["Patas a 90°, rieles alineados","Contraventeos conforme a ingeniería","Testigos de torque visibles","Sin juego físico en ningún punto"],
  specials:[],
  blockers:[
    { kind:"warn", label:"Desviación menor corregible", sub:"Altura fuera de plano o contraventeo suelto", speeches:[
        { who:"lo_epc", title:"Solicitar corrección",
          text:"\"Detecto [desviación] en las evidencias. ¿Es corregible ahora? Mándame foto antes de continuar.\"" },
        { who:"lo_cl", title:"Comunicar al cliente si pregunta",
          text:"\"Ajustando la alineación antes de colocar los paneles — control de calidad estándar.\"" }
      ], chain:["EPC corrige","Live Ops valida","Ingeniería si aplica"], escalate:false },
    { kind:"stop", label:"Estructura inestable o con juego físico", sub:"No montar módulos hasta resolver", speeches:[
        { who:"lo_epc", title:"Paro — no montar módulos",
          text:"\"No montes módulos. La estructura tiene [problema]. Escalo a ingeniería ahora.\"" },
        { who:"lo_cl", title:"Comunicar al cliente",
          text:"\"Revisión estructural antes de los paneles — no comprometemos la integridad del sistema.\"" }
      ], chain:["Live Ops","Ingeniería","Planning"], escalate:true,
      escalateText:"Ingeniería evalúa en sitio o remotamente. Planning decide retrabajo o reprogramación." }
  ]
},
{
  id:"h5",code:"H5",label:"Módulos",phase:"Instalación",phaseColor:"#EF9F27",
  title:"Módulos fotovoltaicos",
  sub:"Validación mecánica antes del cableado",
  objetivo:"Los módulos están correctamente instalados y listos para conectar.",
  criterios:["Modelo coincide con los planos","Clamps con torque de fabricante","Voladizo dentro de 30 cm","Alineación uniforme en todas las filas"],
  specials:[],
  blockers:[
    { kind:"warn", label:"Voladizo excedido o clamps fuera de rango", sub:"Corrección mecánica en campo", speeches:[
        { who:"lo_epc", title:"Solicitar corrección antes de cablear",
          text:"\"Voladizo en [zona] excede 30 cm / clamps en [zona] fuera de rango. Corrígelo y mándame evidencia antes de cablear.\"" },
        { who:"lo_cl", title:"Comunicar al cliente si pregunta",
          text:"\"Ajustando la alineación final de los paneles antes de conectar.\"" }
      ], chain:["EPC corrige","Live Ops valida"], escalate:false },
    { kind:"stop", label:"Modelo no coincide con los planos", sub:"No conectar nada hasta Vo.Bo.", speeches:[
        { who:"lo_epc", title:"Paro — no conectar",
          text:"\"Paro. El modelo instalado no corresponde a ingeniería. No conectes nada — espera Vo.Bo.\"" },
        { who:"lo_cl", title:"Comunicar al cliente",
          text:"\"Verificando una especificación técnica de los paneles. Le confirmamos en breve.\"" }
      ], chain:["Live Ops","Planning — sustitución o rediseño"], escalate:true,
      escalateText:"Planning define si se sustituye material o se actualiza ingeniería. Ninguna conexión hasta Vo.Bo. escrito." },
    { kind:"stop", label:"Módulos fijados fuera de las zonas aprobadas por el fabricante", sub:"Riesgo de pérdida de garantía", speeches:[
        { who:"lo_epc", title:"Paro — evidencia y escalación",
          text:"\"Las zonas de fijación no corresponden a las especificadas por el fabricante. Riesgo de pérdida de garantía. Para — necesito evidencia y escalo a Ingeniería.\"" },
        { who:"lo_cl", title:"Comunicar al cliente",
          text:"\"Estamos validando la fijación de los módulos con el fabricante antes de continuar — protegemos la garantía de su sistema.\"" }
      ], chain:["Live Ops","Ingeniería","Planeación si requiere retrabajo"], escalate:true,
      escalateText:"Ingeniería evalúa zonas válidas según fabricante. Si requiere retrabajo, Planeación autoriza." }
  ]
},
{
  id:"h6",code:"H6",label:"Eléctrico",phase:"Energización",phaseColor:"#7F77DD",
  title:"Eléctrico",
  sub:"Verificar antes de energizar",
  objetivo:"Las conexiones eléctricas son seguras y el sistema está listo para encenderse.",
  criterios:["Continuidad verificada","Megado dentro de rango del manual","Torque en opresores aplicado","Video de conexiones en SCOOP","Conductor de tierra instalado y verificado"],
  specials:[],
  blockers:[
    { kind:"warn", label:"Observación eléctrica menor", sub:"Sujeciones, conector Myers o video incompleto", speeches:[
        { who:"lo_epc", title:"Corregir antes de energizar",
          text:"\"Antes de energizar corriges [observación] y me confirmas con evidencia. No energices hasta mi Vo.Bo.\"" },
        { who:"lo_epc", title:"Objeción — 'ya está bien'",
          text:"\"Puede que funcione. Pero si no está en el protocolo y hay un incidente, la garantía no cubre. No te energizo hasta que esté correcto.\"" }
      ], chain:["EPC corrige","Live Ops valida"], escalate:false },
    { kind:"stop", label:"Falla de aislamiento o tierra ausente", sub:"Riesgo eléctrico real — no energizar", speeches:[
        { who:"lo_epc", title:"Paro absoluto — no energizar",
          text:"\"No energices. Falla de aislamiento / tierra ausente — riesgo eléctrico real. Escalo a ingeniería ahora mismo.\"" },
        { who:"lo_cl", title:"Comunicar al cliente",
          text:"\"Por seguridad eléctrica detenemos la energización. Ingeniería revisa ahora — sin su Vo.Bo. no encendemos nada.\"" }
      ], chain:["Live Ops","Ingeniería eléctrica","Planning"], escalate:true,
      escalateText:"No se energiza bajo ninguna circunstancia sin Vo.Bo. de ingeniería eléctrica." }
  ]
},
{
  id:"h7",code:"H7",label:"Marcha",phase:"Energización",phaseColor:"#7F77DD",
  title:"Puesta en marcha",
  sub:"Sistema energizado — validar operación",
  objetivo:"El sistema genera energía dentro de los parámetros esperados.",
  criterios:["Inversor en línea sin alertas","Generación activa y dentro de rango","Voltajes conforme al unifilar","Prueba de fallo a tierra: pasada"],
  specials:[],
  blockers:[
    { kind:"warn", label:"Generación anómala o alerta menor", sub:"Por debajo del rango esperado", speeches:[
        { who:"lo_epc", title:"Verificar antes de cerrar el hito",
          text:"\"Generación por debajo de lo esperado / alerta en [componente]. Verifica [punto] y confírmame antes de cerrar.\"" },
        { who:"lo_cl", title:"Comunicar al cliente",
          text:"\"El sistema está encendido. Verificando que la generación esté optimizada para las condiciones de hoy.\"" }
      ], chain:["EPC verifica","Live Ops","Ingeniería si persiste"], escalate:false },
    { kind:"stop", label:"Sistema no genera o falla activa", sub:"Desconectar de forma segura", speeches:[
        { who:"lo_epc", title:"Paro — desconectar seguro",
          text:"\"No cierres el hito. Falla activa. Desconecta de forma segura y espera instrucciones de ingeniería.\"" },
        { who:"lo_cl", title:"Comunicar al cliente",
          text:"\"El sistema necesita diagnóstico adicional. Por su seguridad lo desconectamos momentáneamente — le damos seguimiento hoy mismo.\"" }
      ], chain:["EPC desconecta","Ingeniería","Planning"], escalate:true,
      escalateText:"Desconexión segura obligatoria. Ingeniería diagnostica. Planning gestiona fecha de reactivación." },
    { kind:"stop", label:"Falta equipo de medición — multímetro o pinza amperimétrica", sub:"No es posible validar la instalación", speeches:[
        { who:"epc_lo", title:"Reportar a Live Ops",
          text:"\"No contamos con multímetro / pinza amperimétrica. No es posible validar la instalación.\"" },
        { who:"lo_cl", title:"Comunicar al cliente",
          text:"\"Necesitamos un ajuste en el equipo de medición antes de la puesta en marcha. Le confirmamos nueva hora.\"" }
      ], chain:["EPC","Live Ops","Planeación — sin puesta en marcha sin equipo de medición"], escalate:true,
      escalateText:"No hay puesta en marcha sin equipo de medición. Planeación gestiona reposición o reprograma." },
    { kind:"warn", label:"Transformadores de corriente (TC) instalados incorrectamente", sub:"Lecturas del monitoreo indican error de orientación o conexión", speeches:[
        { who:"lo_epc", title:"Verificar orientación y conexión",
          text:"\"Las lecturas del monitoreo indican que los TC están instalados incorrectamente. Verifica orientación y conexión antes de cerrar.\"" }
      ], chain:["EPC corrige","Live Ops valida","Cerrar hito"], escalate:false },
    { kind:"warn", label:"Problemas de señal o comunicación para configurar monitoreo", sub:"Falta WiFi o LAN disponible en sitio", speeches:[
        { who:"lo_epc", title:"Coordinar acceso de red",
          text:"\"¿Hay señal WiFi o LAN disponible en sitio? Si no, necesitamos coordinar una solución antes de cerrar la puesta en marcha.\"" },
        { who:"lo_cl", title:"Solicitar acceso al cliente",
          text:"\"Estamos configurando el sistema de monitoreo — necesitamos acceso a su red WiFi o un punto de red disponible.\"" }
      ], chain:["EPC","Live Ops","Planeación si no se resuelve en sitio"], escalate:false }
  ]
},
{
  id:"h8",code:"HF",label:"Entrega",phase:"Entrega",phaseColor:"#5DCAA5",
  title:"Entrega y activación",
  sub:"Cierre oficial · cliente listo para operar sin asistencia",
  objetivo:"Sitio limpio, sistema activo y cliente listo para operar sin asistencia.",
  criterios:["Interruptor principal marcado (sticker o plumón)","Todos los switches del techo encendidos","Etiquetas legibles: tablero, Niko Box, medidor, inversores","Video de recorrido en SCOOP","Sitio sin residuos ni herramientas","Comunicación enviada a las 3 partes"],
  specials:[
    { title:"Speech de entrega y activación", speeches:[
      { who:"lo_cl", title:"Instrucciones de operación al cliente",
        text:"\"[Nombre], su sistema está listo. El interruptor principal está marcado — ese es el único que necesita tocar. Los demás ya están encendidos. Para cualquier duda, este es su número de contacto. En los próximos días le llegará información sobre el cambio de medidor con CFE — no necesita hacer nada más que estar disponible ese día.\"" },
      { who:"lo_3", title:"Confirmación a las tres partes (simultáneo)",
        text:"\"Buenas tardes, le confirmamos que la instalación solar en [dirección] fue completada exitosamente el día de hoy. El sistema está activo. La fecha estimada para el cambio de medidor con CFE es [fecha]. Para cualquier duda, contacte a [número]. Queda copia de este mensaje para Heineken/Gabriel, empresario y arrendador.\"" }
    ]}
  ],
  blockers:[
    { kind:"warn", label:"Detalle pendiente antes de retirarse", sub:"Limpieza, etiqueta o video incompleto", speeches:[
        { who:"lo_epc", title:"Resolver antes de retirarse",
          text:"\"Antes de retirarte: [limpia zona X / repón etiqueta Y / completa el video]. No cierro el hito hasta tener evidencia.\"" },
        { who:"lo_cl", title:"Comunicar al cliente",
          text:"\"Últimos detalles de limpieza y documentación antes del cierre formal.\"" }
      ], chain:["EPC resuelve en sitio","Live Ops cierra en SCOOP"], escalate:false },
    { kind:"stop", label:"EPC se retira con observaciones abiertas", sub:"Sin liberación hasta cierre total", speeches:[
        { who:"lo_epc", title:"No liberar sin cierre",
          text:"\"No cierras con observaciones abiertas. Necesito resolución en sitio o fecha comprometida para retrabajo antes de que te vayas.\"" },
        { who:"lo_cl", title:"Comunicar al cliente",
          text:"\"Tenemos detalles pendientes antes del cierre formal. Le confirmamos fecha.\"" }
      ], chain:["Live Ops","Planning — visita de cierre"], escalate:true,
      escalateText:"Planning agenda visita de cierre. No se emite liberación de comisionamiento hasta cierre total verificado." }
  ]
}
];
