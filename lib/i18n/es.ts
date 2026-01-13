// lib/i18n/es.ts
import type { I18nDict } from "./types";

export const es: I18nDict = {
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
  },

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
  loggingIn: "Iniciando...",
  createAccount: "Crear cuenta",
  createAdvocateAccount: "Crear cuenta de defensor/a",
  forgotPassword: "Olvidé mi contraseña",
},
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
};