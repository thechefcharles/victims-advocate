// lib/i18n/es.ts
import type { I18nDict } from "./types";

export const es: I18nDict = {
  /* =========================
     NAV / COMMON
  ========================== */
  nav: {
    dashboardVictim: "Mis casos",
    dashboardAdvocate: "Mis clientes",
    login: "Iniciar sesión",
    logout: "Cerrar sesión",
    language: "Idioma",
    brandTagline: "Apoyo a víctimas · Hecho simple",
  },

  common: {
    loading: "Cargando…",
    refresh: "Actualizar",
    refreshing: "Actualizando…",
    backToHome: "← Volver al inicio",
    yes: "Sí",
    no: "No",
  },

  /* =========================
     AUTH PANEL / LOGIN
  ========================== */
  authPanel: {
    signedInAs: "Conectado como",
    signedInAsAdvocate: "Conectado como Defensor/a",
    welcome: "Bienvenido/a",
    goToMyClients: "Ir a Mis clientes →",
    learnHowItWorks: "Aprende cómo funciona",
    advocatesNote:
      "Los defensores no completan solicitudes aquí — las víctimas comparten casos contigo para revisión.",

    progressTitle: "Tu progreso de solicitud",
    stepOf: "Paso {current} de {total}",
    currentSection: "Sección actual:",
    resumeApplication: "Reanudar solicitud",
    startApplication: "Iniciar solicitud",
    myCases: "Mis casos",

    inlineLoginTitle: "Vamos a iniciar sesión",
    emailLabel: "Correo electrónico",
    passwordLabel: "Contraseña",
    rememberMe: "Recordarme",
    signingIn: "Iniciando…",
    signIn: "Iniciar sesión",

    newHere: "¿Nuevo aquí?",
    createVictimAccount: "Crear cuenta de víctima",
    workAsAdvocate: "¿Trabajas como defensor/a?",
    createAdvocateAccount: "Crear cuenta de defensor/a de víctimas",
    needHelp: "¿Necesitas ayuda?",
  },

  loginForm: {
    title: "Iniciar sesión",
    submit: "Iniciar sesión",
    emailPlaceholder: "Correo electrónico",
    passwordPlaceholder: "Contraseña",
    loggingIn: "Iniciando…",
    createAccount: "Crear cuenta",
    createAdvocateAccount: "Crear cuenta de defensor/a",
    forgotPassword: "Olvidé mi contraseña",
  },

  /* =========================
     HOME PAGE
  ========================== */
  home: {
    hero: {
      title: "Apoyo para Víctimas de Delitos",
      subtitle: "Solicita compensación para víctimas hoy.",
      disclaimer:
        "NxtStps es una herramienta de apoyo. No reemplaza asesoría legal, servicios de emergencia ni atención médica. Puedes pausar en cualquier momento y volver cuando estés listo/a.",
    },

    guidedPath: {
      title: "Ruta Guiada de NxtStps",
      badge: "Vista preliminar",
      step1: {
        title: "Cuéntanos qué pasó",
        body: "Hacemos una pregunta a la vez, con un lenguaje calmado y claro.",
      },
      step2: {
        title: "Reúne y revisa tus documentos",
        body:
          "Sube reportes policiales, facturas médicas y otras pruebas. Detectamos faltantes o inconsistencias.",
      },
      step3: {
        title: "Presenta con confianza",
        body:
          "Revisas un borrador limpio del paquete antes de que se envíe al estado.",
      },
      quote:
        "“No tienes que resolver esto solo/a. NxtStps te acompaña, paso a paso, a tu ritmo.”",
    },

    trustBar: {
      title: "Diseñado para el ecosistema real de servicios a víctimas",
      badge1: "Creado con defensores y gestores de casos",
      badge2: "Alineado con reglas estatales de compensación",
      badge3: "Motor con IA para prevenir rechazos",
      badge4: "Seguro, cifrado y confidencial",
    },

    features: {
      title: "En qué te ayuda NxtStps",
      f1: {
        title: "Verificador de elegibilidad",
        body:
          "Responde algunas preguntas clave y explica con calma si podrías calificar, por qué y qué hacer después.",
      },
      f2: {
        title: "Motor para prevenir rechazos",
        body:
          "Convierte las razones más comunes de rechazo en verificaciones automáticas antes de presentar.",
      },
      f3: {
        title: "Organizador automático de documentos",
        body:
          "Reportes policiales, facturas médicas, facturas funerarias y comprobantes de salario—organizados y listos para revisión.",
      },
      f4: {
        title: "Constructor de solicitudes",
        body:
          "Transforma formularios complejos del estado en pasos claros con ejemplos y explicaciones.",
      },
      f5: {
        title: "Chatbot multilingüe para defensores",
        body:
          "NxtGuide explica el proceso en tu idioma, hace preguntas con cuidado y mantiene un enfoque informado por trauma.",
      },
      f6: {
        title: "Soporte estado por estado",
        body:
          "Se adapta a categorías, requisitos y plazos de cada estado para mantener tu solicitud en regla.",
      },
    },

    audience: {
      title: "A quién apoya NxtStps",
      subtitle:
        "NxtStps está diseñado para todos los que participan en el proceso de servicios a víctimas: sobrevivientes, defensores, hospitales y agencias estatales.",
      tabs: {
        victims: "Víctimas",
        advocates: "Defensores/as",
        caseManagers: "Gestores de casos",
        communityOrgs: "Organizaciones comunitarias",
        hospitals: "Hospitales y proveedores médicos",
        government: "Departamentos gubernamentales",
      },
      bullets: {
        victims: {
          b1: "Comprende tus derechos con un lenguaje claro y humano.",
          b2: "Solicita con confianza con guía paso a paso.",
          b3: "Evita errores comunes que retrasan o niegan solicitudes.",
        },
        advocates: {
          b1: "Agiliza tu carga de trabajo con flujos automatizados.",
          b2: "Reduce envíos incompletos y errores evitables.",
          b3: "Mantén atención informada por trauma ahorrando tiempo.",
        },
        caseManagers: {
          b1: "Gestiona casos complejos con documentación organizada.",
          b2: "Sigue el estado de solicitudes de múltiples clientes.",
          b3: "Asegura precisión, cumplimiento y seguimiento a tiempo.",
        },
        communityOrgs: {
          b1: "Centraliza trabajo de apoyo en alcance y defensa.",
          b2: "Mejora coordinación interna y derivaciones efectivas.",
          b3: "Accede a reportes agregados para fortalecer financiamiento.",
        },
        hospitals: {
          b1: "Simplifica procesos de envío y verificación de facturas.",
          b2: "Reduce carga en trabajadores sociales y facturación.",
          b3: "Ayuda a pacientes a acceder a apoyo financiero rápidamente.",
        },
        government: {
          b1: "Recibe solicitudes más limpias y completas.",
          b2: "Reduce atrasos con paquetes estandarizados y sin errores.",
          b3: "Aumenta transparencia, cumplimiento y confianza pública.",
        },
      },
    },

    transparency: {
      title: "Los servicios para víctimas deben ser rápidos, claros y justos.",
      body:
        "NxtStps elimina confusión, documentos faltantes y rechazos evitables—ofreciendo una ruta estable y transparente hacia el apoyo.",
      b1: "Sin cargos ocultos.",
      b2: "Sin juicio.",
      b3: "Sin lenguaje legal confuso.",
      b4: "Diseñado para precisión, dignidad y equidad.",
    },

    state: {
      title: "Adaptado a tu estado",
      body:
        "NxtStps apoyará múltiples estados. Por ahora, nos enfocamos en la Compensación para Víctimas de Delitos en Illinois, pero la arquitectura está lista para crecer.",
      selectLabel: "Selecciona tu estado (vista previa)",
      optionIL: "Illinois (enfoque actual)",
      optionComingSoon: "Más estados próximamente…",
    },

    privacy: {
      title: "Seguridad y privacidad, por diseño",
      b1: "Tu información se cifra en tránsito y en reposo.",
      b2: "Tú controlas qué se comparte y cuándo.",
      b3: "Nada se envía al estado sin tu consentimiento.",
      b4: "Puedes pausar o salir en cualquier momento.",
    },

    multilingual: {
      bold: "Soporte multilingüe.",
      body:
        "NxtStps se está construyendo para soportar 100+ idiomas, con traducción instantánea y guía informada por trauma.",
      badge: "Inglés · Español · Más próximamente",
    },

    footer: {
      rights: "NxtStps. Todos los derechos reservados.",
      disclaimer:
        "NxtStps es una herramienta digital informada por trauma. No reemplaza asesoría legal, servicios de emergencia ni atención de salud mental.",
      links: {
        resourceLibrary: "Biblioteca de recursos",
        forVictims: "Para víctimas",
        privacySecurity: "Privacidad y seguridad",
        terms: "Términos",
        crisis988: "Apoyo en crisis (988)",
      },
    },
  },

  /* =========================
     INTAKE (APPLICATION FLOW)
  ========================== */
  intake: {
    steps: {
      victim: "Víctima",
      applicant: "Solicitante",
      crime: "Delito e incidente",
      losses: "Gastos y dinero",
      medical: "Atención médica y consejería",
      employment: "Trabajo e ingresos",
      funeral: "Funeral y dependientes",
      documents: "Documentos",
      summary: "Resumen",
      },

       errors: {
  missingCaseId: "Falta el ID del caso en la URL.",
  missingCaseIdShort: "Falta el ID del caso.",
},

    viewOnly: "Acceso de solo lectura (no puedes editar este caso).",
    startFailed: "No se pudo iniciar la solicitud. Intenta recargar.",
    missingCaseId: "Se creó, pero falta el ID del caso.",
    started: "Solicitud iniciada",

    loadCase: {
      failed: "No se pudo cargar ese caso (sin acceso o no existe).",
      unexpected: "Ocurrió un error al cargar ese caso.",
    },

    save: {
      viewOnly: "Acceso de solo lectura. No puedes guardar cambios.",
      noCaseLoaded: "Aún no hay un caso cargado. Inicia la solicitud primero.",
      saved: "Solicitud guardada",
      failed: "No se pudo guardar. Intenta de nuevo.",
    },

    pdf: {
      summaryFailed:
        "Hubo un problema al generar el PDF. Por favor intenta de nuevo.",
      summaryUnexpected:
        "Ocurrió un error inesperado al generar el PDF.",
      officialFailed:
        "Hubo un problema al generar el formulario oficial de Illinois. Por favor intenta de nuevo.",
      officialUnexpected:
        "Ocurrió un error al crear el formulario oficial.",
    },

    validation: {
      victimRequired:
        "Por favor completa el nombre de la víctima, fecha de nacimiento y dirección antes de continuar.",
      crimeMinimumRequired:
        "Por favor proporciona al menos la fecha del delito, dónde ocurrió y a qué departamento de policía se reportó.",
      certificationRequired:
        "Antes de guardar esto como un caso, revisa la sección de certificación y agrega tu nombre, fecha y confirmaciones.",
    },

    confirm: {
      noLossesSelected:
        "Aún no has seleccionado ninguna pérdida. ¿Seguro que no quieres solicitar ayuda con costos médicos, funerarios u otros?",
      lossOfEarningsNoEmployer:
        "Indicaste pérdida de ingresos pero aún no ingresaste información del empleador. ¿Continuar de todos modos?",
      funeralSelectedNoData:
        "Indicaste costos funerarios o de sepelio pero aún no ingresaste información funeraria. ¿Continuar de todos modos?",
    },

    saveCase: {
      failed:
        "Hubo un problema al guardar tu caso. Por favor revisa la consola.",
      missingId:
        "Se guardó, pero no se devolvió un ID de caso. Revisa la respuesta del API.",
      unexpected:
        "Ocurrió un error al guardar tu caso. Revisa la consola para más detalles.",
    },
  },

  /* =========================
     FIELD COPY (PAGE/FORM-SPECIFIC LABELS)
  ========================== */
  fields: {
    firstName: { required: "Nombre *" },
    lastName: { required: "Apellido *" },
    dateOfBirth: { required: "Fecha de nacimiento *" },

    cellPhone: {
      label: "Teléfono celular",
      placeholder: "(xxx) xxx-xxxx",
    },

    streetAddress: { required: "Dirección *" },
    apt: { label: "Apartamento / Unidad" },

    city: { required: "Ciudad *" },
    state: { required: "Estado *" },
    zip: { required: "Código postal *" },

    email: { label: "Correo electrónico" },
    alternatePhone: { label: "Teléfono alternativo" },

    genderIdentity: {
      optional: "Identidad de género (opcional)",
      placeholder: "Masculino, femenino, no binario, etc.",
    },
    race: {
      optional: "Raza (opcional)",
      placeholder: "Ej. Negro, Blanco, Asiático, etc.",
    },
    ethnicity: {
      optional: "Etnicidad (opcional)",
      placeholder: "Ej. Hispano/Latino, No hispano",
    },

    hasDisability: {
      question: "¿La víctima tiene alguna discapacidad?",
    },

    disabilityType: {
      physical: "Física",
      mental: "Mental",
      developmental: "Del desarrollo",
      other: "Otra",
    },
  },

  /* =========================
     NXTGUIDE CHAT
  ========================== */
  nxtGuide: {
    title: "NxtGuide",
    subtitle: "Defensor/a virtual con enfoque informado por trauma",
    close: "Cerrar",
    typing: "NxtGuide está escribiendo…",
    empty: {
      title: "Puedes preguntarme cosas como:",
      q1: "“¿Para qué sirve este sitio?”",
      q2: "“¿Dónde empiezo mi solicitud?”",
      q3: "“¿Qué documentos necesito?”",
    },
    placeholders: {
      thinking: "Pensando…",
      ask: "Pregúntale cualquier cosa a NxtGuide...",
    },
    cta: {
      needHelp: "¿Necesitas ayuda?",
      chatWith: "Chatea con NxtGuide",
    },
    errors: {
      respondFailed:
        "Lo siento, tuve problemas para responder. Por favor intenta de nuevo en un momento.",
      technicalProblem:
        "Tuve un problema técnico al intentar responder. Por favor intenta de nuevo pronto.",
    },
  },

  /* =========================
     UI (BUTTONS, MODALS, GENERIC COPY)
  ========================== */
  ui: {
    buttons: {
      back: "Atrás",
      next: "Siguiente",
      continue: "Continuar",
      cancel: "Cancelar",
      close: "Cerrar",
      save: "Guardar",
      saving: "Guardando…",
      submit: "Enviar",
      submitting: "Enviando…",
      edit: "Editar",
      done: "Listo",
      confirm: "Confirmar",
      download: "Descargar",
      upload: "Subir",
      remove: "Eliminar",
      retry: "Reintentar",
      refresh: "Actualizar",
    },

    status: {
      optional: "Opcional",
      required: "Obligatorio",
      yes: "Sí",
      no: "No",
      none: "Ninguno",
      unknown: "Desconocido",
      notProvided: "No proporcionado",
    },

    errors: {
      generic: "Ocurrió un error. Por favor intenta de nuevo.",
      network:
        "Error de red. Verifica tu conexión e inténtalo nuevamente.",
      unauthorized: "No tienes acceso a esto.",
      notFound: "No se pudo encontrar ese elemento.",
    },

    toasts: {
      saved: "Guardado",
      updated: "Actualizado",
      copied: "Copiado",
      uploaded: "Subido",
      removed: "Eliminado",
    },

    modals: {
      confirmTitle: "Confirmar",
      areYouSure: "¿Estás seguro/a?",
    },
  },

  /* =========================
     FORMS (REUSABLE + PAGE/FORM COPY)
  ========================== */
  forms: {
    victim: {
      title: "Información de la víctima",
      description:
        "Esta sección es sobre la persona que fue lesionada físicamente o falleció. Si usted es esa persona y tiene más de 18 años, esta es su información.",
      civilRightsNote:
        "Las siguientes preguntas se utilizan para reportes de derechos civiles y no afectan la elegibilidad. Puede omitir cualquiera que no desee responder.",
      disabilityTypesLabel: "Tipo(s) de discapacidad",
    },

    labels: {
      firstName: "Nombre",
      lastName: "Apellido",
      middleName: "Segundo nombre",
      dateOfBirth: "Fecha de nacimiento",
      email: "Correo electrónico",
      phone: "Teléfono",
      address: "Dirección",
      unit: "Apartamento / Unidad",
      city: "Ciudad",
      state: "Estado",
      zip: "Código postal",
      county: "Condado",
      country: "País",
      relationship: "Relación",
      notes: "Notas",
    },

    placeholders: {
      selectOne: "Selecciona una opción…",
      typeHere: "Escribe aquí…",
      search: "Buscar…",
    },

    documents: {
  title: "Documentos",
  description:
    "Marca lo que ya tienes. Esto ayuda a prevenir retrasos y rechazos.",
  descriptionDraft:
    "Registra qué documentos tienes (las cargas se pueden conectar después).",

  loadFailed: "No se pudo cargar la sección de documentos.",
  noDraft: "No se cargó ningún borrador del caso.",

  saveContinue: "Guardar y continuar",

  coreTitle: "Documentos principales",
  otherTitle: "Otros documentos",

  checklist: {
    policeReport: "Reporte policial / reporte del incidente",
    medicalBills: "Facturas médicas / estados de cuenta",
    counselingBills: "Facturas de consejería / terapia",
    funeralInvoices: "Facturas funerarias / de sepelio",
    wageProof:
      "Comprobante de salarios perdidos (carta del empleador, talones de pago, etc.)",
    idProof: "Identificación (víctima/solicitante)",
  },

  otherEmpty: "Aún no se agregaron otros documentos.",
  otherItemTitle: "Otro documento #{n}",
  otherLabel: "Etiqueta (opcional)",
  otherPlaceholder: "p. ej., orden judicial, recibos",
  otherHaveIt: "¿Lo tienes?",
  otherNotYet: "Aún no",

  addOther: "+ Agregar otro documento",

  notesLabel: "Notas (opcional)",
  notesHint: "Cualquier cosa que falte o que quieras que un defensor sepa.",
},

    validation: {
      required: "Este campo es obligatorio.",
      invalidEmail: "Por favor ingresa un correo electrónico válido.",
      invalidPhone: "Por favor ingresa un número de teléfono válido.",
      invalidZip: "Por favor ingresa un código postal válido.",
      minChars: "Por favor ingresa al menos {min} caracteres.",
      maxChars: "Por favor ingresa {max} caracteres o menos.",
    },

    applicant: {
    title: "Información del solicitante",
    description: "Esta es la persona que solicita la compensación.",
    isVictimAlsoApplicantLabel: "¿La víctima también es el solicitante?",
    sameAsVictimNote: "Por ahora usaremos la información de la víctima como los datos del solicitante.",
  },

  employment: {
  title: "Trabajo e ingresos",
  description:
    "Si la víctima faltó al trabajo o perdió ingresos debido al delito, agrega lo que sepas aquí.",
  descriptionDraft: "Datos del empleador y ausencias laborales (si aplica).",

  loadFailed: "No se pudo cargar la sección de empleo.",
  noDraft: "No se cargó ningún borrador del caso.",

  saveContinue: "Guardar y continuar",

  unknownHint: "Si no estás seguro/a, elige Desconocido.",

  employedAtTimeLabel: "¿La víctima estaba empleada en ese momento?",
  employerNameLabel: "Nombre del empleador (opcional)",
  employerNamePlaceholder: "Empresa / nombre del empleador",
  employerPhoneLabel: "Teléfono del empleador (opcional)",
  employerPhonePlaceholder: "(xxx) xxx-xxxx",
  employerAddressLabel: "Dirección del empleador (opcional)",
  employerAddressPlaceholder: "Calle, ciudad, estado",

  missedWorkLabel: "¿La víctima faltó al trabajo debido al delito?",
  missedWorkFromLabel: "Faltó del trabajo desde (opcional)",
  missedWorkToLabel: "Faltó del trabajo hasta (opcional)",

  disabilityFromCrimeLabel:
    "¿El delito causó una discapacidad que afecta el trabajo?",
},

funeral: {
  title: "Funeral y dependientes",
  description:
    "Si la víctima falleció o hay dependientes afectados por el delito, agrega lo que sepas aquí.",
  descriptionDraft:
    "Detalles de funeral/entierro e información de dependientes (si aplica).",

  loadFailed: "No se pudo cargar la sección de funeral.",
  noDraft: "No se cargó ningún borrador del caso.",

  saveContinue: "Guardar y continuar",

  unknownHint: "Si no estás seguro/a, elige Desconocido.",

  victimDeceasedLabel: "¿La víctima falleció como resultado del delito?",

  funeralHomeTitle: "Funeraria",
  funeralHomeNameLabel: "Nombre de la funeraria (opcional)",
  funeralHomeNamePlaceholder: "Nombre",
  funeralHomePhoneLabel: "Teléfono de la funeraria (opcional)",
  funeralHomePhonePlaceholder: "(xxx) xxx-xxxx",

  dependentsTitle: "Dependientes",
  hasDependentsLabel: "¿Hay dependientes que dependían de la víctima para apoyo?",
  hasDependentsHint:
    "Por ejemplo: hijos, cónyuge u otros dependientes.",
  dependentsCountLabel: "¿Cuántos dependientes? (opcional)",
  dependentsCountPlaceholder: "Ej. 2",
  dependentsNotesLabel: "Notas sobre dependientes (opcional)",
  dependentsNotesPlaceholder: "Cualquier detalle útil…",
},
losses: {
  title: "Gastos y dinero",
  description:
    "Selecciona en qué gastos quieres ayuda. Esto nos ayuda a generar tu paquete y revisar documentos faltantes.",

  options: {
    medical: "Gastos médicos",
    counseling: "Consejería / terapia",
    lostWages: "Salarios / ingresos perdidos",
    funeral: "Costos de funeral / entierro",
    propertyLoss: "Pérdida de propiedad",
    relocation: "Reubicación / vivienda",
    other: "Otro",
  },

  otherLabel: "Otro (describe)",
},

crime: {
  title: "Delito e incidente",
  description: "Los detalles básicos del incidente ayudan a verificar elegibilidad y documentación.",

  incidentDateLabel: "Fecha del incidente",
  incidentTimeLabel: "Hora del incidente (opcional)",
  incidentTimePlaceholder: "p. ej., 9:30 PM",

  locationAddressLabel: "¿Dónde ocurrió? (calle o intersección cercana)",

  policeReportedLabel: "¿Se reportó a la policía?",
  policeDepartmentLabel: "¿Qué departamento de policía?",
  policeReportNumberLabel: "Número de reporte / caso (si lo sabes)",

  offenderKnownLabel: "¿Conoces a la persona agresora?",
  offenderNameLabel: "Nombre de la persona agresora (si lo sabes)",

  narrativeLabel: "En pocas palabras, ¿qué pasó? (opcional)",
  narrativePlaceholder: "Manténlo breve. Puedes agregar más después.",
},

medical: {
  title: "Atención médica y consejería",
  description:
    "Agrega los detalles de atención médica y consejería que conozcas. Si no sabes algo, déjalo en blanco.",
  descriptionDraft:
    "Detalles de tratamiento e información de consejería (si corresponde).",

  loadFailed: "No se pudo cargar la sección de atención médica.",
  noDraft: "No se cargó ningún borrador del caso.",

  saveContinue: "Guardar y continuar",

  hints: {
    unknownOk: "Si no estás seguro, elige Desconocido.",
    dateFormat: "AAAA-MM-DD",
  },

  sections: {
    medical: "Atención médica",
    counseling: "Consejería",
  },

  questions: {
    hasMedicalTreatment: "¿La víctima recibió atención médica?",
    hasCounseling: "¿La víctima recibió consejería / terapia?",
  },

  fields: {
    hospitalName: "Nombre del hospital / centro (opcional)",
    hospitalCity: "Ciudad del hospital / centro (opcional)",
    treatmentStart: "Fecha de inicio del tratamiento (opcional)",
    treatmentEnd: "Fecha de fin del tratamiento (opcional)",
    providerName: "Nombre del consejero / proveedor (opcional)",
    sessionsCount: "Número de sesiones (opcional)",
  },

  placeholders: {
    hospitalName: "Hospital, clínica, urgencias, etc.",
    hospitalCity: "Ciudad",
    providerName: "Terapeuta, clínica, programa, etc.",
    sessionsCount: "p. ej., 8",
  },
},
summary: {
  title: "Resumen",
  description:
    "Revisa lo que ingresaste. Puedes volver a cualquier sección para editar.",
  descriptionDraft: "Revisa tu caso antes de generar documentos.",

  loadFailed: "No se pudo cargar el resumen.",
  noDraft: "No se cargó ningún borrador del caso.",

  save: "Guardar resumen",

  sections: {
    victim: "Víctima",
    applicant: "Solicitante",
    crime: "Delito / incidente",
    losses: "Gastos solicitados",
    medical: "Atención médica y consejería",
    employment: "Trabajo e ingresos",
    funeral: "Funeral",
    documents: "Documentos (cargas)",
    certification: "Certificación",
  },

  labels: {
    name: "Nombre",
    dob: "Fecha de nacimiento",
    phone: "Teléfono",
    email: "Correo electrónico",
    address: "Dirección",
    isVictimAlsoApplicant: "¿La víctima también es solicitante?",
    relationshipToVictim: "Relación con la víctima",
    date: "Fecha",
    time: "Hora",
    location: "Lugar",
    reportedToPolice: "Reportado a la policía",
    policeDepartment: "Departamento de policía",
    reportNumber: "Número de reporte",
    to: "a",
  },

  losses: {
    medical: "Atención médica",
    counseling: "Consejería",
    funeral: "Funeral",
    lostWages: "Salarios perdidos",
    relocation: "Reubicación",
    propertyLoss: "Pérdida de propiedad",
    other: "Otro",
    otherYes: "Sí ({desc})",
    estimatedTotal: "Total estimado",
  },

  medical: {
    medicalTreatment: "Atención médica",
    hospital: "Hospital",
    city: "Ciudad",
    treatmentDates: "Fechas de tratamiento",
    counseling: "Consejería",
    provider: "Proveedor de consejería",
    sessions: "Sesiones",
  },

  employment: {
    employedAtTime: "Trabajaba en ese momento",
    employer: "Empleador",
    missedWork: "Faltó al trabajo",
    missedDates: "Fechas faltadas",
    disabilityFromCrime: "Discapacidad por el delito",
  },

  funeral: {
    victimDeceased: "La víctima falleció",
    funeralHome: "Funeraria",
    funeralPhone: "Teléfono de la funeraria",
    dependentsPresent: "Hay dependientes",
    dependentCount: "Cantidad de dependientes",
    dependentNotes: "Notas sobre dependientes",
  },

  documents: {
    policeReports: "Reportes policiales",
    medicalBills: "Facturas médicas",
    counselingBills: "Facturas de consejería",
    funeralBills: "Facturas funerarias",
    wageProof: "Comprobante de salarios",
    other: "Otro",
    notes: "Notas",
  },

  certification: {
    disclaimer:
      "Esto no es asesoría legal. Es una confirmación en lenguaje sencillo de que la información es correcta según tu mejor conocimiento.",
    fullNameLabel: "Nombre completo (requerido)",
    fullNamePlaceholder: "Escribe tu nombre completo",
    dateLabel: "Fecha (requerida)",
    truthfulLabel:
      "Confirmo que la información proporcionada es verdadera y completa según mi mejor conocimiento.",
    releaseLabel:
      "Entiendo que pueden requerirse documentos de respaldo y que podrían pedirme verificación.",
  },
},
  },
};