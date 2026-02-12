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
       ELIGIBILITY CHECK
    ========================== */
    eligibility: {
        purposeText:
            "Esta breve verificación ayuda a confirmar si puedes solicitar la Compensación para Víctimas de Delitos de Illinois y si estás listo/a para comenzar. No envía una solicitud ni afecta tu elegibilidad.",
        questionOf: "Pregunta {current} de {total}",
        q1: {
            title: "¿Quién presenta la solicitud?",
            question: "¿Qué opción te describe mejor?",
            options: {
                victim18Own:
                    "Soy la víctima, tengo 18 años o más y solicito mis propios gastos",
                parentMinor:
                    "Soy el padre o tutor legal de una víctima menor de 18 años",
                parentDisabled:
                    "Soy el padre o tutor legal de una víctima con discapacidad legal",
                paidExpenses:
                    "Pagué o soy legalmente responsable de pagar los gastos médicos, hospitalarios, funerarios o de entierro de la víctima",
                none: "Ninguna de estas / No estoy seguro/a",
            },
            helper:
                "La ley de Illinois limita quién puede presentar una solicitud. Esta pregunta ayuda a confirmar si tienes permiso para solicitar.",
        },
        q2: {
            title: "Edad o estado legal de la víctima",
            question:
                "¿La víctima es menor de 18 años o tiene una discapacidad legal?",
            helper:
                "Si la víctima es menor de 18 años o tiene discapacidad legal, la solicitud debe ser completada y firmada por un padre o tutor legal.",
            yes: "Sí",
            no: "No",
            notSure: "No estoy seguro/a",
        },
        q3: {
            title: "¿Quién firmará la solicitud?",
            question: "¿Quién firmará la solicitud?",
            options: {
                applicant: "Yo firmaré como solicitante",
                guardian:
                    "Soy el padre o tutor legal y firmaré en nombre de la víctima",
                notSure:
                    "No estoy seguro/a o no puedo obtener la firma requerida",
            },
            helper:
                "La solicitud debe ser firmada por el solicitante o, si la víctima es menor de 18 años o tiene discapacidad legal, por un padre o tutor legal.",
        },
        q4: {
            title: "Reporte policial",
            question: "¿Se reportó el delito a las autoridades?",
            helper:
                "La Oficina del Fiscal General solicitará un reporte policial para investigar el reclamo. Si no tienes uno ahora, aún puedes continuar.",
            yes: "Sí",
            no: "No",
            notSure: "No estoy seguro/a",
        },
        q5: {
            title: "Detalles del reporte policial",
            question: "¿Tienes información del reporte policial?",
            options: {
                haveNumber: "Sí, tengo el número del reporte policial",
                haveAgency:
                    "Conozco el departamento de policía o agencia, pero no el número del reporte",
                dontHave: "Aún no tengo esta información",
            },
            helper:
                "Si no tienes el número del reporte, más adelante te pediremos que proporciones la mayor información posible sobre el delito.",
        },
        q6: {
            title: "Gastos relacionados con el delito",
            question: "¿Por qué gastos buscas reembolso?",
            options: {
                medical: "Gastos médicos u hospitalarios",
                funeral: "Gastos funerarios o de entierro",
                counseling:
                    "Consejería u otros gastos relacionados con el delito",
                notSure: "Aún no estoy seguro/a",
            },
            helper:
                "La compensación se limita a ciertos gastos relacionados con el delito. No necesitas facturas finales para completar esta verificación.",
        },
        q7: {
            title: "Mantener contacto",
            question:
                "¿Puedes recibir de forma confiable correo o llamadas y devolver los documentos solicitados en 45 días?",
            helper:
                "Después de solicitar, la Oficina del Fiscal General puede solicitar formularios o documentos adicionales. Si no pueden comunicarse contigo o si no devuelves los documentos en 45 días, el reclamo puede cerrarse.",
            yes: "Sí",
            notSure: "No estoy seguro/a",
            no: "No",
        },
        resultEligible: {
            headline: "Pareces elegible para solicitar.",
            body: "Según tus respuestas, cumples con los requisitos básicos para presentar una solicitud de Compensación para Víctimas de Delitos de Illinois.",
            cta: "Iniciar solicitud",
            secondary: "Puedes guardar tu progreso y volver cuando quieras.",
        },
        resultNeedsAttention: {
            headline:
                "Puedes ser elegible, pero algunas cosas necesitan atención primero.",
            body: "Puedes solicitar, pero la información faltante o problemas de contacto pueden retrasar o impedir el pago.",
            checklist: [
                "Confirma quién firmará la solicitud",
                "Reúne información del reporte policial (si está disponible)",
                "Asegúrate de que tu dirección y teléfono sean confiables",
                "Prepárate para devolver los documentos solicitados en 45 días",
            ],
            ctaReady: "Continuar cuando estés listo/a",
            ctaHelp: "Obtener ayuda de un defensor/a",
        },
        resultNotEligible: {
            headline:
                "Puede que no seas elegible para solicitar según las reglas de Compensación para Víctimas de Delitos de Illinois.",
            body: "Solo ciertas personas pueden presentar una solicitud, como la víctima (18+), un padre o tutor legal de una víctima menor o con discapacidad, o alguien que pagó gastos elegibles.",
            nextSteps: [
                "Si crees que otra persona debería solicitar, pídele que complete la solicitud",
                "Si necesitas ayuda o referencias, contacta a la Oficina del Fiscal General de Illinois al 1-800-228-3368",
            ],
            cta: "Buscar otras opciones de apoyo",
        },
        status: {
            eligible: "Elegible",
            needsReview: "Requiere revisión",
            notEligible: "No elegible",
            notChecked: "No verificado",
        },
        dashboard: {
            runCheck: "Ejecutar verificación de elegibilidad",
            startIntake: "Iniciar solicitud",
            skipWarningTitle: "¿Ejecutar verificación de elegibilidad primero?",
            skipWarningBody:
                "La verificación de elegibilidad ayuda a confirmar si puedes solicitar y qué esperar. Recomendamos ejecutarla antes de iniciar el formulario de solicitud.",
            continueAnyway: "Continuar a la solicitud de todos modos",
            runCheckFirst: "Ejecutar verificación de elegibilidad primero",
        },
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

        header: {
            badge: "Compensación para Víctimas del Delito (Illinois)",
            title: "Solicitud de compensación",
            subtitle:
                "Responde lo que puedas. Puedes pausar en cualquier momento y volver cuando estés listo/a.",
            needMoreContext: "¿Necesitas más información?",
            learnLink: "Cómo funciona la compensación en Illinois",
        },

        actions: {
            back: "Atrás",
            save: "Guardar",
            saving: "Guardando…",
            autoSaving: "Guardando automáticamente…",
            creatingCase: "Creando el caso…",
            viewOnlyTitle: "Acceso de solo lectura",
            continueToStep: "Continuar a {step} →",
            goToStep: "Ir a {step} →",
            reviewComplete: "Revisión completa",
        },

        viewOnlyBanner:
            "Acceso de solo lectura: puedes revisar este caso, pero no puedes editarlo.",

        footer: {
            draftDisclaimer: "Borrador. Nada se envía al estado sin tu consentimiento.",
        },

        summary: {
            alreadyFinalReview: "Ya estás en el paso final de revisión.",
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
            summaryUnexpected: "Ocurrió un error inesperado al generar el PDF.",
            officialFailed:
                "Hubo un problema al generar el formulario oficial de Illinois. Por favor intenta de nuevo.",
            officialUnexpected: "Ocurrió un error al crear el formulario oficial.",
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

        floating: {
            needHelpOnThisStep: "¿Necesitas ayuda con este paso?",
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

            // Paso de Documentos (en el flujo de solicitud)
            stepTitle: "Sube reportes policiales, facturas y otros documentos",
            viewOnlyBanner:
                "Acceso solo de lectura: puedes revisar esta sección, pero solo el dueño del caso puede subir o modificar documentos.",
            intro:
                "Los documentos de respaldo ayudan a la Oficina del Fiscal General a entender tu caso y verificar los costos que solicitas que se cubran. Puedes subir:",
            bullets: {
                police: "Reportes policiales o números de incidente",
                medical: "Facturas del hospital y médicas",
                funeral: "Facturas de funeral y cementerio",
                wages: "Talones de pago o cartas del empleador",
                other: "Cualquier otra prueba de gastos relacionados con el delito",
            },
            disclaimer:
                "Subir documentos no envía tu solicitud. Tendrás la oportunidad de revisar todo en la página de Resumen antes de enviar cualquier cosa al estado.",
            goToUploadPage: "Ir a la página para subir documentos",

            // Textos para el cargador en línea
            uploader: {
                title: "Adjunta documentos relacionados con {context}",
                helper:
                    "Estas cargas son opcionales, pero pueden ayudar a la Oficina del Fiscal General a revisar más rápido esta parte de tu solicitud.",
                shortDescriptionLabel: "Descripción breve (opcional)",
                shortDescriptionPlaceholder:
                    "p. ej., reporte policial de CPD, n.º de caso...",
                uploadLabel: "Subir archivo(s)",
            },
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
            sameAsVictimNote:
                "Por ahora usaremos la información de la víctima como los datos del solicitante.",

            options: {
                victim: "Soy la víctima (mi información es la misma que arriba)",
                proxy:
                    "Estoy solicitando en nombre de la víctima (padre/madre, cónyuge, otro)",
            }, // <-- IMPORTANT COMMA HERE

            relationshipPlaceholder: "Padre/madre, cónyuge, hermano/a, amigo/a...",

            legalGuardianship: {
                question:
                    "Si la víctima es menor de edad o un adulto incapacitado, ¿tienes tutela legal?",
                noNotSure: "No / No estoy seguro/a",
            },

            // NEW: Seeking own expenses
            seekingOwnExpenses: {
                question: "¿Estás solicitando compensación por tus propios gastos?",
            },
            descriptionOfExpensesSought: {
                label: "Si no, ¿qué gastos estás solicitando compensación?",
                placeholder: "Describe los gastos por los que estás solicitando compensación...",
            },
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

        employmentExtended: {
            title: "Trabajo e ingresos (pérdida de ingresos)",
            description:
                "Si faltaste al trabajo debido al delito, el programa puede considerar pagar parte de esos ingresos perdidos.",

            fields: {
                employerNameLabel: "Nombre del empleador",
                employerAddressLabel: "Dirección del empleador",
                employerPhoneLabel: "Teléfono del empleador",
                netMonthlyWagesLabel: "Tus ingresos netos mensuales (pago que recibes)",
                netMonthlyWagesPlaceholder: "Por ejemplo: 2200",
            },

            benefits: {
                question:
                    "Después del delito, ¿recibiste tiempo por enfermedad, vacaciones, discapacidad u otros beneficios pagados?",
                notesLabel:
                    "Si lo recuerdas, descríbelo brevemente (por ejemplo: 2 semanas de pago por enfermedad, 3 días de vacaciones)...",
                // NEW: Benefit breakdown fields
                sickPayLabel: "Enfermedad $",
                vacationPayLabel: "Vacaciones $",
                personalTimeLabel: "Personal $",
                disabilityPayLabel: "Discapacidad $",
                otherBenefitLabel: "Otro $",
            },

            noNotSure: "No / No estoy seguro/a",

            footerNote:
                "En una versión posterior, podrás agregar más trabajos y más detalles aquí.",

            uploaderContextLabel: "trabajo e ingresos (talones de pago, cartas del empleador)",
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
        funeralExtended: {
            title: "Funeral, entierro y dependientes",
            description:
                "Si la víctima falleció como resultado del delito, este programa puede ayudar con los costos del funeral, entierro o cremación. Puedes ingresar información básica aquí.",

            funeralHome: {
                nameLabel: "Nombre de la funeraria",
                phoneLabel: "Teléfono de la funeraria",
                billTotalLabel: "Total de la factura del funeral (aproximado)",
            },

            cemetery: {
                title: "Información del cementerio",
                nameLabel: "Nombre del cementerio",
                phoneLabel: "Teléfono del cementerio",
                billTotalLabel: "Total de la factura del cementerio (aproximado)",
            },

            payer: {
                title: "¿Quién ha pagado o pagará estos costos?",
                nameLabel: "Nombre de la persona que paga",
                relationshipLabel: "Relación con la víctima",
                relationshipPlaceholder: "Padre/madre, cónyuge, hermano/a, amigo/a...",
                amountPaidLabel: "Monto pagado hasta ahora (aproximado)",
            },

            esvf: {
                question:
                    "¿Recibiste dinero del ESVF de la Ciudad de Chicago para gastos funerarios?",
                amountLabel: "¿Cuánto pagó el ESVF? (aproximado)",
            },

            lifeInsurance: {
                question:
                    "¿La víctima tenía un seguro de vida que pagó después de su fallecimiento?",
                companyLabel: "Compañía de seguro de vida",
                beneficiaryNameLabel: "Nombre del beneficiario",
                beneficiaryPhoneLabel: "Teléfono del beneficiario",
                amountPaidLabel: "Monto pagado (aproximado)",
            },

            dependents: {
                title: "Dependientes que dependían de los ingresos de la víctima",
                nameLabel: "Nombre del dependiente",
                relationshipLabel: "Relación con la víctima",
                relationshipPlaceholder: "Hijo/a, cónyuge, pareja, etc.",
                dobLabel: "Fecha de nacimiento del dependiente",
                guardianLabel: "Nombre y teléfono del tutor (si es menor)",
            },

            placeholders: {
                moneyExample8000: "Por ejemplo: 8000",
                moneyExample2000: "Por ejemplo: 2000",
                moneyExample1500: "Por ejemplo: 1500",
                moneyExample10000: "Por ejemplo: 10000",
            },

            noNotSure: "No / No estoy seguro/a",

            footerNote:
                "En una versión posterior, podrás agregar a cada dependiente aquí y vincularlos a reclamos por pérdida de apoyo.",

            uploaderContextLabel: "funeral, entierro y dependientes",

            // NEW: Death benefits section
            deathBenefits: {
                title: "Beneficios por muerte",
                description:
                    "Si la víctima falleció, por favor proporciona información sobre cualquier beneficio por muerte recibido.",
                deathBenefitChicagoFundLabel: "Beneficio por Muerte del Fondo de la Ciudad de Chicago $",
                lifeHealthAccidentInsuranceLabel:
                    "Seguro de vida, salud, accidentes, remolque de vehículos o responsabilidad civil $",
                unemploymentPaymentsLabel: "Pagos de Desempleo $",
                veteransSocialSecurityBurialLabel:
                    "Beneficios de Entierro de Veteranos o Seguro Social $",
                workersCompDramShopLabel: "Compensación Laboral o Dram Shop $",
                federalMedicarePublicAidLabel:
                    "Medicare Federal o Programa de Asistencia Pública Estatal $",
            },
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

        lossesExtended: {
            title: "¿En qué necesitas ayuda para pagar?",
            description:
                "Esta sección enumera los tipos de gastos y pérdidas que podrían estar cubiertos por la Compensación para Víctimas de Delitos. Selecciona todo lo que corresponda.",

            groups: {
                medical: { title: "Médico, consejería y necesidades básicas" },
                work: { title: "Trabajo, ingresos y apoyo" },
                funeralProperty: { title: "Funeral, sepelio y propiedad" },
                personalOther: { title: "Artículos personales y otros" },
            },

            items: {
                medicalHospital: "Facturas médicas / hospitalarias",
                dental: "Atención dental",
                counseling: "Consejería / terapia",
                transportation: "Transporte a citas médicas o a la corte",
                accessibilityCosts: "Costos de accesibilidad (rampas para silla de ruedas, etc.)",
                temporaryLodging: "Alojamiento temporal / hotel",
                relocationCosts: "Costos de reubicación (mudanza por seguridad)",

                lossOfEarnings: "Pérdida de ingresos (faltó al trabajo)",
                lossOfSupport: "Pérdida de apoyo para dependientes",
                lossOfFutureEarnings: "Pérdida de ingresos futuros",
                replacementServiceLoss:
                    "Pérdida de servicios de reemplazo (servicios que la víctima brindaba)",
                tuition: "Matrícula / costos relacionados con la escuela",

                funeralBurial: "Funeral / sepelio / cremación",
                headstone: "Lápida",
                crimeSceneCleanup: "Limpieza de la escena del crimen",
                towingStorage: "Remolque y almacenamiento del vehículo",
                securityRepairs: "Puertas, cerraduras y ventanas (reparaciones de seguridad)",

                evidenceClothingBedding: "Ropa o ropa de cama incautada como evidencia",
                assistiveItems: "Prótesis, lentes/anteojos y audífonos",
                replacementCosts: "Costos de reemplazo de artículos necesarios",
                legalFees: "Honorarios legales",
                tattooRemoval: "Eliminación de tatuajes (casos de trata de personas)",
            },

            footerNote:
                "Seleccionar un elemento aquí no garantiza el pago, pero le indica al programa qué estás solicitando que se considere.",
        },

        crime: {
            title: "Delito e incidente",
            description:
                "Los detalles básicos del incidente ayudan a verificar elegibilidad y documentación.",

            // ===== Existing keys (kept for backwards compatibility) =====
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

            // ===== NEW: keys required by CrimeForm =====
            sectionTitle: "Detalles del delito y del incidente",
            sectionDescription:
                "Esta sección es sobre lo que ocurrió. No necesitas recordar cada detalle.",

            dateOfCrimeLabel: "Fecha del delito *",
            dateReportedLabel: "Fecha en que se reportó el delito",

            crimeAddressLabel:
                "¿Dónde ocurrió el delito? (dirección o lugar aproximado) *",

            crimeCityLabel: "Ciudad *",
            crimeCountyLabel: "Condado",

            reportingAgencyLabel:
                "Departamento de policía al que se reportó el delito *",
            reportingAgencyPlaceholder:
                "p. ej., Departamento de Policía de Chicago",

            policeReportNumberHelp:
                "Número de reporte policial (si lo tienes)",

            crimeDescriptionLabel: "Describe brevemente lo que ocurrió",
            crimeDescriptionPlaceholder:
                "En tus propias palabras, describe el incidente.",

            injuryDescriptionLabel: "Describe brevemente las lesiones",
            injuryDescriptionPlaceholder:
                "Por ejemplo: herida de bala en la pierna, cirugía, PTSD, etc.",

            offenderKnownQuestion: "¿Sabes quién hizo esto?",
            noNotSure: "No / No estoy seguro/a",

            offenderNamesLabel: "Nombre(s) de la persona agresora, si lo sabes",

            offenderRelationshipLabel:
                "Relación con la víctima, si existe",
            offenderRelationshipPlaceholder:
                "Desconocido, pareja, familiar, etc.",

            sexualAssaultKitQuestion:
                "¿Se realizó un kit de recolección de evidencia de agresión sexual en un hospital?",

            uploaderContextLabel:
                "el delito y el incidente (reportes policiales, declaraciones de testigos)",
        },

        medicalExtended: {
            title: "Facturas médicas, dentales y de consejería",
            description:
                "Si estás solicitando ayuda con facturas médicas, dentales, hospitalarias o de consejería, puedes incluir al menos un proveedor aquí.",

            fields: {
                providerNameLabel: "Nombre del hospital / clínica / terapeuta principal",
                cityLabel: "Ciudad",
                phoneLabel: "Teléfono del proveedor",
                serviceDatesLabel: "Fechas de servicio (si las sabes)",
                amountLabel: "Monto total aproximado de esta factura",
                amountPlaceholder: "Por ejemplo: 2500",
            },

            otherSources: {
                question:
                    "¿Tienes seguro médico, ayuda pública u otros programas que puedan pagar parte de estas facturas?",
                descriptionLabel:
                    "Enumera brevemente cualquier seguro o programa (Medical Card, Medicare, seguro privado, etc.)",
            },

            noNotSure: "No / No estoy seguro/a",

            footerNote:
                "En una versión posterior, podrás agregar más proveedores aquí, o tu defensor/a puede adjuntar una lista completa.",

            uploaderContextLabel: "facturas médicas y de consejería",
        },

        contact: {
            title: "Información de contacto",
            description:
                "Ayúdanos a contactarte y trabajar con tu defensor si tienes uno.",

            prefersEnglishQuestion: "¿Es el inglés tu idioma preferido?",
            preferredLanguageLabel: "Si no, idioma en el que te sientes más cómodo hablando:",
            preferredLanguagePlaceholder: "ej. Español, Polaco, etc.",

            workingWithAdvocateQuestion: "¿Estás trabajando con un defensor?",
            advocateNameLabel: "Nombre del defensor",
            advocatePhoneLabel: "Teléfono del defensor",
            advocateOrganizationLabel: "Organización del defensor",
            advocateEmailLabel: "Correo electrónico del defensor",

            consentToTalkToAdvocateQuestion:
                "¿Consientes que la Oficina del Fiscal General discuta tu reclamo con tu defensor u obtenga documentos requeridos para tu reclamo?",

            alternateContactQuestion:
                "¿Hay otra persona con la que prefieras que nos contactemos para discutir tu reclamo?",
            alternateContactNameLabel: "Nombre del contacto alternativo",
            alternateContactPhoneLabel: "Teléfono del contacto alternativo",
            alternateContactRelationshipLabel: "Relación contigo",
        },

        court: {
            title: "Información judicial y restitución",
            description:
                "Si hay un caso penal, puedes compartir lo que sepas. Está bien si no conoces todos estos detalles — responde lo que puedas.",

            noNotSure: "No / No estoy seguro/a",

            offenderArrestedQuestion: "¿La persona agresora fue arrestada?",
            offenderChargedQuestion: "¿Se presentaron cargos en la corte?",
            applicantTestifiedQuestion:
                "¿Te han pedido declarar/testificar en el caso penal?",

            criminalCaseNumberLabel: "Número de caso penal (si lo sabes)",
            criminalCaseOutcomeLabel: "¿Cuál fue el resultado del caso penal? (si lo sabes)",
            criminalCaseOutcomePlaceholder:
                "Por ejemplo: condenado, caso desestimado, acuerdo de culpabilidad, aún pendiente…",

            restitutionOrderedQuestion:
                "¿La corte ordenó que la persona agresora pague restitución (dinero directamente para ti o en tu nombre)?",

            restitutionAmountLabel: "Si sí, ¿cuánto (aproximado)?",
            restitutionAmountPlaceholder: "Por ejemplo: 5000",

            humanTraffickingQuestion:
                "¿La persona agresora ha estado involucrada en un proceso judicial por trata de personas relacionado con este incidente?",

            humanTraffickingTestifiedQuestion:
                "¿Te pidieron testificar en el caso judicial de trata de personas?",

            humanTraffickingCaseNumberLabel:
                "Número del caso de trata de personas (si lo sabes)",
            humanTraffickingCaseOutcomeLabel:
                "Resultado del caso de trata de personas (si lo sabes)",
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

            // ===== Solo UI =====
            quickTitle: "Resumen rápido",
            quickDescription:
                "Esta es una vista rápida de lo que has ingresado hasta ahora.",

            viewOnlyBanner:
                "Acceso solo de lectura: puedes revisar este caso, pero no puedes editar campos, certificación ni invitaciones.",

            placeholders: {
                none: "—",
                notProvided: "No proporcionado",
                relationshipNotSet: "relación no establecida",
                alreadyFinalReview: "Ya estás en el paso final de revisión.",
            },

            actions: {
                downloadSummaryPdf: "Descargar PDF de resumen",
                downloadOfficialIlPdf: "Descargar formulario oficial de CVC de Illinois",
                // Alias para la clave usada en SummaryView
                downloadOfficialIl: "Descargar formulario oficial de CVC de Illinois",
                saveCaseForAdvocateReview: "Guardar como caso para revisión de un defensor",
                // Alias para la clave usada en SummaryView
                saveCaseForAdvocate: "Guardar como caso para revisión de un defensor",
                inviteAdvocate: "Invitar a un defensor",
                close: "Cerrar",
                sendInvite: "Enviar invitación",
                inviting: "Enviando…",

            },

            invite: {
                title: "Invitar a un defensor",
                note: "El defensor ya debe tener una cuenta con este correo electrónico.",
                advocateEmailLabel: "Correo del defensor",
                advocateEmailPlaceholder: "defensor@ejemplo.com",
                allowEdit: "Permitir que este defensor edite",

                // Compatibilidad (mantener)
                results: {
                    saveCaseFirst:
                        "Primero guarda esto como un caso para poder generar un enlace seguro de invitación.",
                    mustBeLoggedIn: "Debes iniciar sesión para invitar a un defensor.",
                    unexpected: "Error inesperado al invitar al defensor.",
                    accessGranted:
                        "✅ Acceso otorgado.\nComparte este enlace con el defensor:\n{url}",
                },

                // Forma común usada en componentes
                errors: {
                    saveCaseFirst:
                        "Primero guarda esto como un caso para poder generar un enlace seguro de invitación.",
                    mustBeLoggedIn: "Debes iniciar sesión para invitar a un defensor.",
                    unexpected: "Error inesperado al invitar al defensor.",
                },
                success: {
                    accessGranted:
                        "✅ Acceso otorgado.\nComparte este enlace con el defensor:\n{url}",
                },
            },

            snapshots: {
                victimTitle: "Víctima",
                applicantTitle: "Solicitante",
                applicantSamePerson: "La víctima y el solicitante son la misma persona.",

                crimeTitle: "Resumen del delito",
                crime: {
                    dateOfCrime: "Fecha del delito",
                    location: "Lugar",
                    cityCounty: "Ciudad / Condado",
                    reportedTo: "Reportado a",
                    policeReportNumber: "N.º de reporte policial",
                },

                lossesTitle: "Gastos / pérdidas",
                lossesNone: "Aún no se seleccionaron gastos.",

                medicalTitle: "Resumen médico",
                medical: {
                    provider: "Proveedor",
                    cityPhone: "Ciudad / Teléfono",
                    serviceDates: "Fechas del servicio",
                    approxBillAmount: "Monto aproximado de la factura",
                    noneEntered: "Aún no se ingresó ningún proveedor médico.",
                },

                workTitle: "Resumen de trabajo",
                work: {
                    employer: "Empleador",
                    employerPhone: "Teléfono del empleador",
                    netMonthlyWages: "Salario neto mensual",
                    noneEntered: "Aún no se ingresó información de trabajo.",
                },

                funeralTitle: "Resumen de funeral",
                funeral: {
                    funeralHome: "Funeraria",
                    funeralHomePhone: "Teléfono de la funeraria",
                    totalFuneralBill: "Total de la factura del funeral",
                    payer: "Pagador",
                    amountPaidSoFar: "Monto pagado hasta ahora",
                    noPayer: "Aún no se ingresó un pagador.",
                    noneEntered: "Aún no se ingresó información del funeral.",
                },
            },

            // Alias (algunos componentes esperan estos bloques a nivel superior)
            crime: {
                title: "Resumen del delito",
                // Alias para claves planas usadas en SummaryView (forms.summary.crime.*)
                dateOfCrime: "Fecha del delito",
                location: "Lugar",
                cityCounty: "Ciudad / Condado",
                reportedTo: "Reportado a",
                policeReportNumber: "N.º de reporte policial",
                fields: {
                    dateOfCrime: "Fecha del delito",
                    location: "Lugar",
                    cityCounty: "Ciudad / Condado",
                    reportedTo: "Reportado a",
                    policeReportNumber: "N.º de reporte policial",
                },
            },

            medicalSnapshot: {
                title: "Resumen médico",
                fields: {
                    provider: "Proveedor",
                    cityPhone: "Ciudad / Teléfono",
                    serviceDates: "Fechas del servicio",
                    approxBillAmount: "Monto aproximado de la factura",
                },
                noneEntered: "Aún no se ingresó ningún proveedor médico.",
            },

            employmentSnapshot: {
                title: "Resumen de trabajo",
                fields: {
                    employer: "Empleador",
                    employerPhone: "Teléfono del empleador",
                    netMonthlyWages: "Salario neto mensual",
                },
                noneEntered: "Aún no se ingresó información de trabajo.",
            },

            funeralSnapshot: {
                title: "Resumen de funeral",
                fields: {
                    funeralHome: "Funeraria",
                    funeralHomePhone: "Teléfono de la funeraria",
                    totalFuneralBill: "Total de la factura del funeral",
                    payer: "Pagador",
                    amountPaidSoFar: "Monto pagado hasta ahora",
                },
                noPayer: "Aún no se ingresó un pagador.",
                noneEntered: "Aún no se ingresó información del funeral.",
            },

            certificationUi: {
                title: "Certificación y autorización",
                checks: {
                    subrogation:
                        "Reconozco la subrogación (pueden aplicar reglas de reembolso).",
                    release:
                        "Reconozco la autorización/liberación para verificación según se requiera.",
                    perjury:
                        "Confirmo que la información es verdadera según mi mejor conocimiento.",
                },
                signatureLabel: "Firma del solicitante (escribe tu nombre completo)",
                dateLabel: "Fecha",

                attorney: {
                    question: "¿Estás siendo representado por un abogado?",
                    yes: "Sí",
                    no: "No",

                    name: "Nombre del abogado",
                    ardc: "Número ARDC (si lo conoces)",
                    address: "Dirección del abogado",
                    city: "Ciudad",
                    state: "Estado",
                    zip: "Código postal",
                    phone: "Teléfono",
                    email: "Correo electrónico",
                },
            },

            // Alias (muchas UIs esperan `summary.certification.*`)
            certification: {
                title: "Certificación y autorización",
                checks: {
                    subrogation:
                        "Reconozco la subrogación (pueden aplicar reglas de reembolso).",
                    release:
                        "Reconozco la autorización/liberación para verificación según se requiera.",
                    perjury:
                        "Confirmo que la información es verdadera según mi mejor conocimiento.",
                },
                signatureLabel: "Firma del solicitante (escribe tu nombre completo)",
                dateLabel: "Fecha",
                attorney: {
                    question: "¿Estás siendo representado por un abogado?",
                    name: "Nombre del abogado",
                    ardc: "Número ARDC (si lo conoces)",
                    address: "Dirección del abogado",
                    city: "Ciudad",
                    state: "Estado",
                    zip: "Código postal",
                    phone: "Teléfono",
                    email: "Correo electrónico",
                },
            },

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
                // Usado para la lista de pérdidas en el resumen
                noneSelected: "Aún no se seleccionaron gastos.",
                medical: "Atención médica",
                counseling: "Consejería",
                funeral: "Funeral",
                lostWages: "Salarios perdidos",
                relocation: "Reubicación",
                propertyLoss: "Pérdida de propiedad",
                other: "Otro",
                otherYes: "Sí ({desc})",
                estimatedTotal: "Total estimado",
                // NEW: Claves específicas de tipos de pérdidas usadas por SummaryView
                medicalHospital: "Médico/Hospital",
                dental: "Dental",
                transportation: "Transporte",
                accessibilityCosts: "Costos de Accesibilidad",
                crimeSceneCleanup: "Limpieza de Escena del Crimen",
                relocationCosts: "Costos de Reubicación",
                temporaryLodging: "Alojamiento Temporal",
                tattooRemoval: "Remoción de Tatuajes",
                lossOfEarnings: "Pérdida de Ingresos",
                tuition: "Matrícula",
                replacementServiceLoss: "Pérdida de Servicio de Reemplazo",
                locks: "Cerraduras",
                windows: "Ventanas",
                clothing: "Ropa",
                bedding: "Ropa de Cama",
                prostheticAppliances: "Aparatos Protésicos",
                eyeglassesContacts: "Lentes/Contactos",
                hearingAids: "Audífonos",
                replacementCosts: "Costos de Reemplazo",
                lossOfSupport: "Pérdida de Apoyo",
                towingStorage: "Remolque y Almacenamiento",
                funeralBurial: "Funeral/Entierro",
                lossOfFutureEarnings: "Pérdida de Ingresos Futuros",
                legalFees: "Honorarios Legales",
                doors: "Puertas",
                headstone: "Lápida",
            },

            medical: {
                medicalTreatment: "Atención médica",
                hospital: "Hospital",
                city: "Ciudad",
                treatmentDates: "Fechas de tratamiento",
                counseling: "Consejería",
                sessions: "Sesiones",
                // Campos usados en algunos resúmenes/instantáneas (mantener)
                provider: "Proveedor",
                // NEW: Claves usadas por SummaryView
                cityPhone: "Ciudad / Teléfono",
                serviceDates: "Fechas de servicio",
                // Alias para la clave usada en SummaryView
                amount: "Monto aproximado de la factura",
                // Alias cuando no hay proveedor principal
                noneEntered: "Aún no se ingresó ningún proveedor médico.",
            },

            employment: {
                employedAtTime: "Trabajaba en ese momento",
                employer: "Empleador",
                missedWork: "Faltó al trabajo",
                missedDates: "Fechas faltadas",
                disabilityFromCrime: "Discapacidad por el delito",
                // NEW: Claves usadas por SummaryView
                employerPhone: "Teléfono del empleador",
                netMonthlyWages: "Ingresos netos mensuales",
                // Alias cuando no hay información de trabajo
                noneEntered: "Aún no se ingresó información de trabajo.",
            },

            funeral: {
                victimDeceased: "La víctima falleció",
                funeralHome: "Funeraria",
                funeralPhone: "Teléfono de la funeraria",
                funeralHomePhone: "Teléfono de la funeraria", // NEW: Alias para SummaryView
                dependentsPresent: "Hay dependientes",
                dependentCount: "Cantidad de dependientes",
                dependentNotes: "Notas sobre dependientes",
                // NEW: Claves usadas por SummaryView
                payer: "Pagador",
                noPayer: "Aún no se ingresó ningún pagador.",
                // Alias usados por SummaryView
                totalBill: "Total de la factura del funeral",
                amountPaid: "Monto pagado hasta ahora",
                relationshipNotSet: "relación no establecida",
                // Alias cuando no hay información de funeral
                noneEntered: "Aún no se ingresó información del funeral.",
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

            certificationText: {
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
            applicant: {
                // Alias para el texto usado cuando la víctima y el solicitante son la misma persona
                samePerson: "La víctima y el solicitante son la misma persona.",
            },
        }, // closes summary
    }, // closes forms
}; // closes es