// lib/i18n/es.ts
import type { I18nDict } from "./types";

export const es: I18nDict = {
    /* =========================
       NAV / COMMON
    ========================== */
    nav: {
        dashboard: "Panel",
        dashboardApplicant: "Mis casos",
        dashboardAdvocate: "Mis clientes",
        login: "Iniciar sesión",
        logout: "Cerrar sesión",
        myAccount: "Mi cuenta",
        accountPlaceholderTitle: "Cuenta",
        accountPlaceholderBody:
            "Pronto habrá más opciones de cuenta y preferencias aquí.",
        accountVictimEmailCardBody:
            "Este es el correo con el que inicias sesión. Puedes actualizar los datos de tu perfil en el formulario de arriba.",
        accountAdvocateEmailCardBody:
            "Este es el correo con el que inicias sesión. Actualiza tus datos de contacto laboral en el formulario de arriba.",
        language: "Idioma",
        brandTagline: "Apoyo a víctimas · Hecho simple",
        compensationHub: "Compensación",
        home: "Inicio",
        help: "Ayuda",
        updates: "Actualizaciones",
        accountNav: "Cuenta",
        mySupport: "Mi panel",
        messages: "Mensajes",
        application: "Solicitud",
        myDashboardAdvocate: "Mi panel",
        myDashboardOrganization: "Mi panel",
        commandCenter: "Mi panel",
        clients: "Clientes",
        organization: "Organización",
        orgSettings: "Ajustes de org",
        organizationHome: "Inicio de organización",
        organizationSetupNav: "Configurar organización",
        adminHome: "Administración",
    },

    common: {
        loading: "Cargando…",
        refresh: "Actualizar",
        refreshing: "Actualizando…",
        backToHome: "← Volver al inicio",
        backToWorkspace: "← Volver a tu espacio de trabajo",
        backToWorkspaceInline: "Volver a tu espacio de trabajo",
        yes: "Sí",
        no: "No",
    },

    notificationsPage: {
        title: "Notificaciones",
        subtitle:
            "Marca una notificación como leída para quitarla del contador del icono. Las leídas muestran una marca verde.",
        empty: "No tienes notificaciones ahora.",
        markRead: "Marcar como leída",
        readBadgeLabel: "Leída",
        previewHiddenTitle: "Tienes una actualización nueva",
        connectionRequestIncomingTitle: "Solicitud de conexión",
        connectionRequestPendingTitle: "Solicitud de conexión pendiente",
        orgJoinRequestIncomingTitle: "Solicitud de membresía de defensor/a",
        orgJoinApprove: "Aprobar",
        orgJoinDecline: "Rechazar",
    },

    signup: {
        preferredNameLabel: "Nombre preferido",
        preferredNamePlaceholder: "p. ej. Alex o Alex Martínez",
        preferredNameHelp:
            "Usamos tu nombre para personalizar tu panel y mensajes. Puedes añadir más datos en la cuenta después.",
        pageEyebrow: "Empezar",
        pageTitle: "Crea tu cuenta",
        pageSubtitle:
            "Primero crea una cuenta personal. Si diriges una agencia, elige Líder de organización: conectarás o propondrás tu organización después de iniciar sesión, no en este paso.",
        backHome: "← Volver al inicio",
        accountTypeLabel: "¿Cómo usarás NxtStps?",
        typeApplicant: "Solicitante",
        typeAdvocate: "Defensor/a",
        typeOrganization: "Líder de organización",
        hintApplicant:
            "Herramientas personales y pasos guiados mientras trabajas en una solicitud de compensación u otro apoyo.",
        hintAdvocate: "Herramientas de caso para quienes apoyan a solicitantes.",
        hintOrganization:
            "Para quienes representan una agencia. Vincularás o propondrás tu organización tras verificar el correo y los acuerdos—no durante el registro.",
        orgSignupBefore: "¿Representas una organización? Elige",
        orgSignupAfter: "arriba: completarás los pasos de la organización después de iniciar sesión.",
        signInPrompt: "¿Ya tienes cuenta?",
        signInLink: "Iniciar sesión",
    },

    applicantDashboard: {
        eyebrow: "Mi panel",
        title: "Mi panel",
        welcomeTitle: "Bienvenido/a, {name}",
        subtitle: "",
        signedInAs: "Sesión iniciada como",
        signedInAsUnknown: "—",
        whatToDoNext: "Siguiente paso",
        creating: "Creando…",
        yourApplicationHeading: "Tu solicitud",
        yourApplicationDescription: "Esta es tu solicitud actual de apoyo.",
        yourApplicationPrivacyLine:
            "Tu estado y elegibilidad están disponibles dentro de tu solicitud.",
        statusField: "Estado",
        eligibilityField: "Elegibilidad",
        updatingDetails: "Actualizando detalles…",
        priorityHigh: "Requiere atención",
        priorityMedium: "Siguiente",
        priorityLow: "Todo bien",
        caseActivityTitle: "Este caso",
        caseActivityIntro: "Lo de abajo es solo para el caso que elegiste arriba.",
        caseActivityMessages: "Mensajes",
        caseActivityDocuments: "Documentos",
        caseActivityAppointments: "Citas",
        caseActivitySupport: "Opciones de apoyo",
        messagesLoading: "Cargando mensajes…",
        messagesUnreadOne: "1 mensaje sin leer",
        messagesUnreadMany: "{count} mensajes sin leer",
        messagesInThread: "Hilo de mensajes abierto",
        messagesEmpty: "Aún no hay mensajes",
        documentsStatusMissing: "Aún faltan algunos documentos obligatorios",
        documentsStatusGeneric: "Añade documentos cuando puedas",
        documentsNoCase: "Abre tu solicitud para gestionar documentos",
        appointmentsEmpty: "No hay citas próximas",
        supportMatchOne: "1 coincidencia sugerida",
        supportMatchMany: "{count} coincidencias sugeridas",
        supportNoMatches: "Aún no hay coincidencias",
        supportNoCase: "Abre tu solicitud para ver opciones de apoyo",
        yourCasesTitle: "Tus casos",
        yourCasesHelp: "Elige un caso en el menú para actualizar el panel. Todo lo de abajo corresponde a ese caso.",
        stateIL: "Illinois",
        stateIN: "Indiana",
        startApplication: "Añadir otro caso",
        noCasesTitle: "Aún no hay caso",
        noCasesBody:
            "Toca el botón verde de arriba para empezar. Guardamos tu avance automáticamente.",
        loadError:
            "No se pudieron cargar tus casos. Revisa tu conexión, actualiza la página e inténtalo de nuevo.",
        sessionExpired: "La sesión expiró. Vuelve a iniciar sesión.",
        continue: "Continuar",
        more: "Más",
        delete: "Eliminar",
        rename: "Renombrar",
        save: "Guardar",
        cancel: "Cancelar",
        caseNamePlaceholder: "Nombre del caso",
        lastUpdatedDaysAgo: "Última actualización hace {days} días",
        lastUpdatedToday: "Última actualización hoy",
        lastUpdatedYesterday: "Última actualización ayer",
        lastUpdatedUnknown: "Fecha de última actualización no disponible",
        deleteModalTitle: "¿Eliminar esta solicitud?",
        deleteModalBodyLine1: "Esto quitará tu información de esta solicitud.",
        deleteModalBodyLine2: "No podrás deshacer este paso.",
        deleteModalCancel: "Cancelar",
        deleteModalConfirm: "Eliminar",
        deleteFailed: "No se pudo eliminar esta solicitud. Inténtalo de nuevo.",
        editNameTitle: "Editar nombre",
        progressTitle: "Tu avance",
        selectedCaseLabel: "Estás trabajando en",
        activeCaseBadge: "Seleccionado",
        funnel: {
            ariaLabel: "Tres pasos",
            stepEligibility: "Ver elegibilidad",
            stepApplication: "Solicitar",
            stepSupport: "Seguimiento",
            stepHint:
                "Toca un paso para abrirlo. La elegibilidad forma parte de iniciar tu solicitud; si la omitiste, el primer paso aparece en rojo pero aún puedes solicitar y hacer seguimiento.",
        },
        myCasesDropdown: "Mis casos",
        myCasesSectionLabel: "Mis casos",
        resumeApplication: "Reanudar solicitud",
        applyResumeCardAria: "Iniciar o reanudar tu solicitud",
        supportTeamTitle: "Mi Equipo De Apoyo",
        supportTeamNoCaseHint:
            "No necesitas un caso para ver el estado de conexión. Cuando inicies una solicitud, los detalles de organización y defensor/a también pueden aparecer para ese caso.",
        supportTeamPendingOrgConnectsTitle: "Solicitud de organización pendiente",
        supportTeamAdvocateMorePending: "Solicitud(es) adicional(es) de defensor/a pendiente(s)",
        supportTeamOrg: "Organización",
        supportTeamAdvocates: "Defensor/a",
        supportTeamNoOrg:
            "Aún no hay organización vinculada. En la siguiente pantalla puedes añadir tu ubicación para ver organizaciones cerca de ti.",
        supportTeamNoAdvocates: "Aún no hay defensor/a conectado/a.",
        supportTeamLoading: "Cargando…",
        supportTeamConnectCta: "Conectar con un/a defensor/a",
        supportTeamAdvocateRequestPending:
            "Solicitud de conexión pendiente — te avisaremos cuando responda tu defensor/a.",
        supportTeamAddOrgCta: "Organizaciones cerca de mí",
        supportTeamEditOrgTitle: "Gestionar la organización para este caso",
        supportTeamEditAdvocateTitle: "Gestionar defensores para este caso",
        supportTeamSendMessage: "Enviar mensaje",
        supportTeamContactOrg: "Contactar organización",
        caseAdvocateManage: {
            title: "Defensores en este caso",
            back: "Volver al panel",
            intro:
                "Estas personas pueden acceder a esta solicitud. Puedes quitar a alguien o conectar con otra persona. Los mensajes seguros están en tu solicitud.",
            sendMessage: "Enviar mensaje",
            remove: "Quitar del caso",
            removeConfirmTitle: "¿Quitar a esta persona?",
            removeConfirmBody:
                "Ya no podrá abrir este caso. Podrás enviar una nueva solicitud de conexión después si lo necesitas.",
            connectDifferent: "Conectar u añadir defensor/a",
            removed: "Defensor/a quitado/a de este caso.",
            removeFailed: "No se pudo quitar. Inténtalo de nuevo.",
        },
        caseOrgManage: {
            title: "Organización para este caso",
            back: "Volver al panel",
            intro:
                "La organización vinculada aplica solo a esta solicitud. Cambiarla actualiza mensajes y la coincidencia de programas para este caso.",
            contactOrganization: "Contactar organización",
            changeOrganization: "Cambiar organización",
            removeOrganization: "Quitar vínculo con la organización",
            removeConfirmTitle: "¿Quitar el vínculo con la organización?",
            removeConfirmBody:
                "Tu caso usará la organización predeterminada de la plataforma hasta que elijas otra. Los mensajes pueden usar otro hilo.",
            legacyLabel: "Predeterminada (sin organización de servicios a víctimas)",
            organizationRemoved:
                "Se quitó el vínculo con la organización. Este caso usa la organización predeterminada de la plataforma hasta que elijas otra.",
            updated: "Organización actualizada.",
            updateFailed: "No se pudo actualizar. Inténtalo de nuevo.",
            noOrgBody: "Aún no hay organización de servicios a víctimas para este caso.",
            referralUpdatesTitle: "Actualizaciones de referencia",
            referralUpdatesIntro:
                "Cada línea es una organización a la que escribiste. Si aceptan, tu caso queda conectado con ellos.",
            referralsLoadError: "No pudimos cargar el estado de la referencia. Puedes intentar más tarde.",
            referralStatusPending: "Esperando su respuesta",
            referralStatusAccepted:
                "Aceptada — tu caso ya está conectado a esta organización",
            referralStatusDeclined:
                "Rechazaron la solicitud — tu caso sigue con tu organización actual",
            referralUpdatesEmpty:
                "Aún no hay referencias. Cuando envíes una desde Organizaciones cerca de ti, verás actualizaciones aquí.",
        },
        applyPathConnect: "Conectar con un defensor",
        applyPathSelf: "Solicitar por mi cuenta",
        applyPathBack: "Atrás",
        applyPathAria: "Solicitar",
        stateModalTitle: "¿Programa de qué estado?",
        stateModalSubtitle:
            "Illinois e Indiana usan formularios y preguntas distintas; usaremos el que corresponda.",
        eligibleReviewIntro:
            "Iniciaremos tu solicitud para {state} y te llevaremos a la revisión de elegibilidad.",
        continueToEligibility: "Continuar a elegibilidad",
        applyNow: "Solicitar ahora",
        profileBannerTitle: "Completa tu perfil",
        profileBannerBodyNoName:
            "Añade cómo te gusta que te llamen en la cuenta; lo usaremos en tu panel.",
        profileBannerBody:
            "Añade tu teléfono y ciudad para que defensores y organizaciones puedan contactarte cuando trabajes en un caso.",
        profileBannerCta: "Abrir configuración de la cuenta",
        startNewApplication: "Iniciar una solicitud nueva",
        newCaseButton: "Nuevo caso",
        caseEdit: "Editar",
        getHelp: {
            title: "Obtener ayuda",
            connectAdvocate: "Conectar con un/a defensor/a",
            findOrganizations: "Organizaciones cerca de mí",
            hintAdvocate: "Mensajes seguros y solicitudes en pocos pasos.",
            hintOrganizations: "Mapa y orden por distancia si compartes ubicación.",
        },
        findOrganizationsPage: {
            title: "Organizaciones cerca de ti",
            subtitle:
                "Explora organizaciones de servicios a víctimas en tu zona. Tu ubicación exacta permanece en este dispositivo: ordenamos distancias aquí, no en nuestros servidores.",
            back: "← Volver a Mi panel",
            mapIntro:
                "Usa el mapa para ver organizaciones cerca de ti. Toca el botón solo cuando quieras compartir tu ubicación en esta sesión del navegador.",
            shareLocation: "Compartir mi ubicación",
            sharing: "Obteniendo ubicación…",
            tryAgain: "Intentar de nuevo",
            locationDenied:
                "Se bloqueó el acceso a la ubicación. Puedes activarlo en la configuración del navegador e intentar otra vez.",
            locationUnavailable:
                "No pudimos leer tu ubicación. Puedes intentar de nuevo o revisar Wi‑Fi y la ubicación en tu dispositivo.",
            locationTimeout:
                "Se agotó el tiempo para la ubicación. Inténtalo de nuevo; acercarte a una ventana o activar Wi‑Fi suele ayudar.",
            positionUnavailable:
                "Tu dispositivo no pudo fijar la posición ahora. Inténtalo en un momento o permite la ubicación para este sitio.",
            locationNotSupported:
                "Este navegador no admite ubicación o está desactivada. Prueba otro navegador o dispositivo.",
            locationNeedsHttps:
                "La ubicación solo funciona en una página segura (HTTPS). Abre el sitio con https:// o pide ayuda.",
            yourLocation: "Tu ubicación aproximada",
            approximateNote: "Ubicación aproximada",
            milesAway: "mi de distancia",
            accepting: "Acepta nuevos clientes",
            notAccepting: "No acepta nuevos clientes",
            capacity: "Capacidad",
            noOrgs:
                "Aún no hay organizaciones en el mapa. Mostramos socios activos en NxtStps (incluso si su perfil público sigue en borrador). Si esperabas ver una agencia, confirma en administración que la organización esté marcada como activa o vuelve más tarde.",
            loadError:
                "No pudimos cargar las organizaciones. Revisa tu conexión, actualiza la página e inténtalo de nuevo.",
            privacyNote:
                "Las distancias se calculan en tu navegador. No enviamos tus coordenadas GPS a nuestros servidores.",
            sendReferral: "Enviar referencia para revisión",
            sendReferralSending: "Enviando…",
            sendReferralDone:
                "Referencia enviada. El equipo de la organización puede revisar tu caso.",
            sendReferralFailed:
                "No se pudo enviar la referencia. Inténtalo de nuevo u otra organización.",
            sendReferralDuplicate:
                "Ya tienes una referencia en curso con esta organización. Revisa Organización para este caso para ver el estado.",
            learnMoreTitle: "Respuesta y accesibilidad",
            learnMoreDialogTitle: "Cómo mostramos la calidad de la organización",
            learnMoreDialogSubtitle:
                "Áreas ponderadas y datos que los socios pueden completar con el tiempo. Las puntuaciones y niveles resumen señales de confianza: no son asesoramiento clínico ni legal.",
            learnMore: "Cómo funcionan las puntuaciones y los niveles",
            learnMoreClose: "Cerrar",
            organizationProfile: "Perfil de la Organización",
            visitWebsite: "Visitar sitio web",
            connectWithOrg: "Conectar con la organización",
            connectSending: "Enviando…",
            connectDone: "Se notificó al equipo de la organización.",
            connectFailed: "No se pudo enviar tu solicitud. Inténtalo de nuevo.",
            connectDuplicate: "Ya enviaste una solicitud de conexión a esta organización.",
            externalDirectoryNote:
                "Este socio aparece en nuestro directorio de recursos. La información detallada de respuesta y accesibilidad se mostrará cuando completen un perfil completo en NxtStps.",
            profileUnavailableExternal: "No hay enlace de perfil",
            connectUnavailableExternal: "La conexión está disponible para organizaciones en NxtStps.",
            connectHelpNeedsBack: "← Volver al mapa",
            connectHelpNeedsTitle: "¿Con qué necesitas ayuda?",
            connectHelpNeedsSubtitle:
                "Selecciona todo lo que aplique. La organización usará esto para saber cómo apoyarte y a quién asignarte.",
            connectHelpNeedsOrgLabel: "Conectando con",
            connectHelpNeedsSelectHint: "Selecciona todo lo que corresponda",
            needGeneralSupport: "Apoyo general",
            needPoliceReport: "Reporte policial",
            needMedicalBills: "Gastos médicos",
            needEmployment: "Empleo",
            needFuneral: "Funeral",
            connectHelpNeedsSubmit: "Enviar solicitud de conexión",
            connectHelpNeedsSubmitting: "Enviando…",
            connectHelpNeedsPickOne: "Elige al menos una opción para continuar.",
            connectHelpNeedsInvalidLink:
                "Falta una organización válida en este enlace. Vuelve al mapa y usa Conectar otra vez.",
            connectHelpNeedsLoadOrgError: "No pudimos cargar esa organización. Inténtalo desde el mapa.",
            connectHelpNeedsSuccess:
                "Se envió tu solicitud. El equipo de la organización verá lo que seleccionaste y se pondrá en contacto cuando pueda.",
            connectSuccessModalTitle: "Solicitud enviada",
            connectSuccessModalBody:
                "Se notificó a la organización. Espera una respuesta en un plazo de 48 horas por parte de tu defensor/a.",
            connectSuccessModalCrisisLead: "Si estás en peligro inmediato, llama al",
            connectSuccessModalCrisisOr: "o llama o envía un mensaje de texto al",
            connectSuccessModalCrisisTail: "(línea de prevención del suicidio y crisis).",
            connectSuccessModalReturnDashboard: "Volver al panel",
            connectHelpNeedsContinueBrowse: "Volver al mapa de organizaciones",
            orgProfileBack: "← Volver al mapa de organizaciones",
            orgProfileSubtitle: "Información del perfil público de la organización.",
            orgProfileLoading: "Cargando organización…",
            orgProfileInvalid:
                "Ese enlace de organización no funciona. Vuelve al mapa y elige una organización de la lista.",
            orgProfileServices: "Servicios",
            orgProfileContact: "Contacto",
            orgProfilePopulations: "Enfoque",
            orgProfileFooter:
                "Los datos los reporta la organización. Si algo no coincide, puedes contactarla con los datos del listado del mapa.",
            directoryProgramType: "Tipo de programa",
            directoryAddress: "Dirección",
            directoryPhone: "Teléfono",
            directoryWebsite: "Sitio web",
            fieldPendingExternal: "Pendiente — la organización lo añade en su perfil de NxtStps.",
            fieldPendingFallback: "Aún no especificado",
            frameworkFieldPending:
                "Aún no especificado — la organización puede añadirlo en su perfil.",
            directoryContactHeading: "Contacto del directorio",
            tier1Title: "Nivel 1 — Integral",
            tier1Desc: "Puntuación 85+ · Hospital / CBO principal",
            tier2Title: "Nivel 2 — Establecida",
            tier2Desc: "Puntuación 65–84 · Sin fines de lucro con personal / clínica",
            tier3Title: "Nivel 3 — Básica",
            tier3Desc: "Puntuación <65 · Comunitaria / informal",
            sourceSelfHint: "Reportado por la organización",
            sourcePlatformHint: "Señal medida por la plataforma",
        },
        caseActivityForCase: "Para este caso",
        caseDetailsHeading: "Detalles Del Caso",
        nextStepTitle: "Siguiente paso",
        eligibilityPickStateFirst:
            "Elige Illinois o Indiana para abrir el programa correcto para este caso.",
        applyForCompensation: "Solicitar compensación para víctimas",
        applyModal: {
            title: "Antes de empezar",
            body:
                "Recomendamos una revisión rápida para ver si podrías calificar. Puedes abrir el formulario sin eso—si lo omites, tu solicitud podría no aprobarse si no calificas.",
            checkFirst: "Primero ver si califico",
            skipToForm: "Omitir y abrir el formulario",
            skipNote: "Si omites la revisión, la solicitud puede denegarse si no calificas.",
        },
        nextAction: {
            labels: {
                noCases: "Solicitar compensación para víctimas",
                noFocusCase: "Elige un caso",
                continueEligibility: "¿Soy elegible?",
                continueApplication: "Seguir con tu solicitud",
                viewMessages: "Leer mensajes",
                uploadDocuments: "Subir documentos faltantes",
                completeRequiredInfo: "Completar datos obligatorios",
                continueSectionsIncomplete: "Seguir con el formulario",
                reviewSkippedFields: "Revisar preguntas omitidas",
                connectAdvocate: "Conectar con un/a defensor/a",
                viewSupportOptions: "Ver opciones de apoyo",
                upToDate: "Abrir tu solicitud",
            },
            reasons: {
                noCases: "Empieza aquí—solo unos minutos.",
                noFocusCase: "Elige el caso en el que quieres trabajar o inicia uno nuevo.",
                continueEligibility: "Responde unas preguntas para ver si podrías calificar.",
                continueApplication:
                    "Tu avance está guardado. Puedes continuar la solicitud cuando te sientas preparado/a.",
                submitApplication:
                    "La información obligatoria parece completa—envía cuando estés listo/a.",
                messagesUnreadOne: "Tienes un mensaje sin leer.",
                messagesUnreadMany: "Tienes {count} mensajes sin leer.",
                uploadDocuments: "Faltan documentos que necesitamos para avanzar.",
                completeRequiredInfo: "Quedan datos obligatorios pendientes.",
                continueSectionsIncomplete: "Aún faltan partes del formulario.",
                reviewSkippedFields: "Omitiste algunas cosas—revísalas cuando puedas.",
                connectAdvocate: "Puedes pedir conectar con un/a defensor/a.",
                viewSupportOptions: "Puede haber programas locales que te ayuden.",
                upToDate: "Nada urgente—abre tu solicitud cuando quieras.",
            },
        },
        contextualNextStep: {
            checkEligibility: "Ver elegibilidad",
            finishApplication: "Terminar la solicitud",
            submitApplication: "Enviar",
        },
    },

    applicantMessages: {
        backDashboard: "Volver a Mi panel",
        eyebrow: "Mensajería segura",
        title: "Mensajes",
        subtitle:
            "Chatea con tu equipo de defensa en un solo lugar por caso. Esto está aparte del formulario de solicitud.",
        loadError:
            "No se pudieron cargar tus casos. Revisa tu conexión, actualiza la página e inténtalo de nuevo.",
        noCases: "Aún no tienes un caso. Inicia una solicitud para usar mensajes seguros.",
        startApplication: "Iniciar solicitud",
        casePickerLabel: "Casos",
        yourCases: "Tus casos",
        threadHeading: "Conversación",
        threadSubtitle: "Solo quienes tienen acceso a este caso pueden ver este hilo.",
        threadEmpty: "Aún no hay mensajes. Saluda o haz una pregunta.",
    },

    advocateDashboard: {
        welcomeTitle: "Bienvenido/a, {name}",
        titleFallback: "Mi panel",
        organizationMeta: "Organización: {name}",
        noOrganizationMeta:
            "Aún no estás vinculado/a al espacio de una agencia. Busca tu organización en el mapa y envía una solicitud de ingreso—tu agencia recibirá una notificación para aprobarla.",
        connectOrganizationLink: "Conectar tu organización",
        profileBannerTitle: "Completa tu perfil de defensor/a",
        profileBannerBody:
            "Añade tus datos de contacto laboral para que sobrevivientes y tu equipo sepan cómo localizarte.",
        profileBannerBodyNoName:
            "Indica cómo debemos dirigirnos a ti y tus datos de contacto laboral—ayuda a sobrevivientes y a tu equipo a contactarte.",
        profileBannerCta: "Actualizar en Mi cuenta",
    },

    advocateFindOrganizations: {
        title: "Encuentra tu organización",
        subtitle:
            "Filtra por estado, explora el mapa y solicita unirte a tu agencia. Los administradores de la organización reciben una notificación para aprobar tu membresía.",
        back: "← Volver a mi panel",
        mapIntro:
            "Usa el mapa para ver organizaciones cerca de ti. Toca el botón solo cuando quieras compartir tu ubicación en esta sesión del navegador.",
        stateFilterLabel: "Estado",
        shareLocation: "Compartir mi ubicación",
        sharing: "Obteniendo ubicación…",
        tryAgain: "Intentar de nuevo",
        locationDenied:
            "Se bloqueó el acceso a la ubicación. Puedes activarlo en la configuración del navegador e intentar otra vez.",
        locationUnavailable:
            "No pudimos leer tu ubicación. Intenta de nuevo o revisa Wi‑Fi/ubicación en tu dispositivo.",
        locationTimeout:
            "Se agotó el tiempo de ubicación. Intenta de nuevo—acercarte a una ventana o activar Wi‑Fi suele ayudar.",
        positionUnavailable:
            "Tu dispositivo no pudo determinar la posición ahora. Intenta en un momento o activa la ubicación para este sitio.",
        locationNotSupported:
            "Este navegador no admite ubicación o está desactivada. Prueba otro navegador o dispositivo.",
        locationNeedsHttps:
            "La ubicación solo funciona en una página segura (HTTPS). Abre el sitio con https:// o contacta soporte.",
        yourLocation: "Tu ubicación aproximada",
        approximateNote: "Pin aproximado",
        milesAway: "mi de distancia",
        accepting: "Acepta nuevos clientes",
        notAccepting: "No acepta nuevos clientes",
        capacity: "Capacidad",
        noOrgs:
            "Aún no hay organizaciones en el mapa. Mostramos socios activos en NxtStps (incluso si su perfil público sigue en borrador). Si esperabas ver una agencia, confirma en administración que la organización esté marcada como activa o vuelve más tarde.",
        noOrgsInState:
            "Ninguna organización coincide con este estado. Prueba “Todos los estados” u otro estado.",
        loadError:
            "No se pudieron cargar las organizaciones. Revisa tu conexión, actualiza la página e inténtalo de nuevo.",
        privacyNote:
            "Las distancias se calculan en tu navegador. No enviamos tus coordenadas GPS a nuestros servidores.",
        requestJoin: "Solicitar unirme",
        requestSent: "Solicitud enviada. Tu organización recibirá una notificación en Actualizaciones.",
        requestBusy: "Enviando…",
        requestError: "No se pudo enviar la solicitud. Inténtalo de nuevo.",
        orgPickerLabel: "Organización",
        orgSearchPlaceholder: "Buscar por nombre o región…",
        orgSearchNoMatches:
            "Sin coincidencias. Prueba otras palabras o ajusta el filtro de estado.",
        orgSelectedTitle: "Organización seleccionada",
    },

    compensationHub: {
        contextLine: "Mi panel → Compensación",
        eyebrow: "Compensación para víctimas del delito",
        title: "Ayuda con compensación",
        subtitle:
            "Compensación para víctimas de Illinois o Indiana—en lenguaje claro, a tu ritmo.",
        primaryCta: "Iniciar mi solicitud",
        primaryHint: "Te guiaremos paso a paso.",
        secondaryGetHelp: "Obtener ayuda ahora",
        secondaryConnectAdvocate: "Conectar con un/a defensor/a",
        learnLink: "Cómo funciona la compensación",
        howItWorksTitle: "Cómo funciona",
        step1Label: "Paso 1",
        step1Title: "Verificar elegibilidad",
        step1Body: "Preguntas breves para saber qué puede aplicar antes de los detalles.",
        step2Label: "Paso 2",
        step2Title: "Completar tu solicitud",
        step2Body: "Ingesta guiada, documentos y un borrador que puedes revisar.",
        step3Label: "Paso 3",
        step3Title: "Mantenerse en contacto",
        step3Body: "Mensajes, defensores y próximos pasos mientras avanza tu caso.",
        mayNeedTitle: "Qué podrías necesitar (si lo tienes)",
        mayNeedLi1: "Nombre de la víctima, fecha de nacimiento y dirección",
        mayNeedLi2: "Fecha y lugar del delito; número de reporte policial si lo tienes",
        mayNeedLi3: "Facturas médicas o funerarias; datos del empleador por salarios perdidos",
        mayNeedFootnote:
            "¿Falta algo? Aún puedes empezar—te ayudamos a planear qué reunir.",
        disclaimerShort:
            "NxtStps no es un sitio gubernamental; los flujos reflejan las solicitudes oficiales de CVC de Illinois e Indiana.",
        modalTitle: "Selecciona tu estado",
        modalBody: "¿A qué programa estatal de Compensación para Víctimas del Delito estás aplicando?",
        modalCancel: "Cancelar",
        guestConnectHint:
            "Para conectar con un/a defensor/a necesitas una cuenta gratuita—te guiamos al tocar Conectar con un/a defensor/a.",
        nonVictimRoleHint:
            "Las conexiones con defensores son para cuentas de sobrevivientes—Obtener ayuda ahora abre Ayuda para otros roles.",
        openAdvocateDashboard: "Abrir panel de casos",
    },

    compensationConnectAdvocate: {
        title: "Conectar con un/a defensor/a",
        // FIXME: English copy was updated 2026-04-11 — Spanish needs human review.
        // Do not machine-translate. New English meaning: "An advocate can guide you through your application and help you gather what you need. Search our verified directory or connect by email if you already know one."
        // Stale until a native Spanish speaker approves a replacement.
        subtitle:
            "Encuentra programas cerca de ti o envía una solicitud si ya conoces el correo de tu defensor/a. Las organizaciones provienen de nuestro directorio (perfiles verificados con zonas de servicio y formas de contacto).",
        // FIXME: English copy was updated 2026-04-11 — Spanish needs human review.
        // Do not machine-translate. New English meaning: "To connect an advocate, you'll first need an application started. Open your dashboard to begin or continue one."
        // Stale until a native Spanish speaker approves a replacement.
        caseRequiredHint:
            "Las solicitudes de conexión están ligadas a un caso específico. Abre Mi panel, selecciona tu caso y vuelve a elegir Conectar con un/a defensor/a.",
        caseLinkedNote:
            "Caso seleccionado: las derivaciones y solicitudes aplican solo a esta solicitud.",
        addressStepTitle: "¿Dónde te encuentras?",
        addressStepBody:
            "Ingresa la dirección de tu domicilio, ciudad, estado y código postal. Solo lo usamos para mostrar organizaciones cercanas en un mapa (OpenStreetMap). No guardamos esta dirección en este paso del mapa a menos que la guardes en otra parte de tu solicitud.",
        directoryNote:
            "Los puntos del mapa son registros de organizaciones activas en NxtStps (a menudo del directorio de recursos), incluidos socios que aún preparan su perfil público. Los pins usan coordenadas guardadas o el estado donde atienden.",
        homeAddressLabel: "Dirección",
        homeAddressPlaceholder: "p. ej. Calle Principal 123",
        cityLabel: "Ciudad",
        cityPlaceholder: "p. ej. Chicago",
        stateLabel: "Estado",
        zipLabel: "Código postal",
        zipPlaceholder: "5 dígitos",
        findOrganizationsButton: "Mostrar organizaciones cerca de mí",
        geocoding: "Buscando dirección…",
        geocodeFailed:
            "No pudimos ubicar esa dirección en el mapa. Revisa la calle y el código postal e intenta de nuevo.",
        changeAddress: "Cambiar dirección",
        mapSectionTitle: "Organizaciones cerca de ti",
        emailInsteadTitle: "¿Ya tienes el correo de tu defensor/a?",
        emailInsteadBody:
            "Ingresa su correo y enviaremos una notificación para conectar en este caso.",
        advocateEmailLabel: "Correo del defensor/a",
        sendRequest: "Enviar solicitud de conexión",
        sending: "Enviando…",
        homePinLabel: "Tu domicilio",
        findOrgsFooterPrefix: "También puedes explorar organizaciones en",
        findOrgsLink: "Buscar organizaciones",
        findOrgsFooterSuffix: "en cualquier momento después de iniciar sesión.",
    },

    compensationDocumentsPage: {
        loginToUpload:
            "Inicia sesión para subir documentos. Los archivos se vinculan a tu cuenta para guardarlos con tu caso.",
        uploadFailedGeneric:
            "No pudimos subir ese archivo. Revisa el formato y el tamaño, e inténtalo de nuevo.",
        networkError:
            "No pudimos contactar al servidor. Revisa tu conexión, espera un momento e inténtalo de nuevo.",
    },

    /* =========================
       ELIGIBILITY CHECK
    ========================== */
    eligibility: {
        introQualify: "Veamos si puedes calificar.",
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
            question: "¿Se reportó el incidente a las autoridades?",
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
            headline: "Puedes calificar.",
            body: "Según tus respuestas, cumples con los requisitos básicos para presentar una solicitud de Compensación para Víctimas de Delitos de Illinois.",
            cta: "Continuar solicitud",
            secondary: "Puedes guardar tu progreso y volver cuando quieras.",
        },
        resultNeedsAttention: {
            headline:
                "Aún puedes ser elegible.",
            body: "Puedes solicitar, pero la información faltante o problemas de contacto pueden retrasar o impedir el pago.",
            checklist: [
                "Confirma quién firmará la solicitud",
                "Reúne información del reporte policial (si está disponible)",
                "Asegúrate de que tu dirección y teléfono sean confiables",
                "Prepárate para devolver los documentos solicitados en 45 días",
            ],
            ctaReady: "Continuar solicitud",
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

    eligibilityIN: {
        introQualify: "Veamos si puedes calificar.",
        purposeText:
            "Esta breve verificación ayuda a confirmar si puedes solicitar la Compensación para Víctimas de Crímenes Violentos de Indiana. No envía una solicitud ni afecta tu elegibilidad.",
        questionOf: "Pregunta {current} de {total}",
        q1: {
            title: "¿Quién está solicitando?",
            question: "¿Qué opción te describe mejor?",
            options: {
                victim: "Yo fui quien sufrió daño directo por lo que pasó",
                surviving_spouse: "Soy el cónyuge sobreviviente de la persona que sufrió el daño",
                dependent_child: "Soy hijo/a dependiente de la persona que sufrió el daño",
                none: "Ninguna de estas / No estoy seguro/a",
            },
            helper:
                "La ley de Indiana limita quién puede solicitar a personas que sufrieron daño, cónyuges sobrevivientes o hijos dependientes.",
        },
        q2: {
            title: "Dónde ocurrió",
            question: "¿El incidente ocurrió en Indiana?",
            helper: "El Fondo de Compensación para Víctimas de Crímenes Violentos de Indiana solo cubre incidentes ocurridos en Indiana.",
            yes: "Sí",
            no: "No",
            notSure: "No estoy seguro/a",
        },
        q3: {
            title: "Reporte policial y cooperación",
            question:
                "¿El incidente fue reportado a las autoridades en 72 horas y estás dispuesto/a a cooperar durante la investigación y el juicio?",
            helper:
                "Indiana suele exigir reporte en 72 horas en la mayoría de los casos. Contacta a ICJI al 1-800-353-1484 si tienes preguntas.",
            yes: "Sí",
            no: "No",
            notSure: "No estoy seguro/a",
        },
        q4: {
            title: "Gastos de bolsillo",
            question:
                "¿Tú o la persona para quien solicitas tuvieron al menos $100 en gastos de bolsillo por el incidente?",
            helper: "Facturas médicas, costos funerarios, consejería y otros gastos elegibles cuentan para el mínimo de $100.",
            yes: "Sí",
            no: "No",
            notSure: "No estoy seguro/a",
        },
        q5: {
            title: "Conducta",
            question: "¿La persona que aplica contribuyó al incidente o a su lesión?",
            helper:
                "Si contribuyó al incidente o a la lesión, el fondo puede no pagar — ICJI puede explicar cómo aplica esta regla.",
            yes: "No, no contribuyó",
            no: "Sí, contribuyó",
            notSure: "No estoy seguro/a",
        },
        q6: {
            title: "Plazo de presentación",
            question: "¿La solicitud puede presentarse dentro de 180 días de la fecha del incidente?",
            helper:
                "Indiana suele exigir solicitudes en 180 días. Hay excepciones. Contacta a ICJI para más información.",
            yes: "Sí",
            no: "No",
            notSure: "No estoy seguro/a",
        },
        q7: {
            title: "Si el solicitante es menor de 18",
            question: "Si eres menor de 18, ¿un padre o tutor legal firmará y fechará la solicitud?",
            helper: "Indiana requiere que un padre o tutor legal firme para solicitantes menores de 18. Si no aplica, elige N/A.",
            yes: "Sí",
            no: "No",
            notSure: "No estoy seguro/a",
            na: "N/A (tengo 18 años o más)",
        },
        resultEligible: {
            headline: "Puedes calificar.",
            body: "Según tus respuestas, cumples los requisitos básicos para presentar una solicitud de Compensación para Víctimas de Indiana.",
            cta: "Continuar solicitud",
            secondary: "Puedes guardar tu progreso y volver en cualquier momento.",
        },
        resultNeedsAttention: {
            headline: "Aún puedes ser elegible.",
            body: "Puedes solicitar, pero información faltante puede retrasar o impedir el pago.",
            checklist: [
                "Confirma el reporte en 72 horas y disposición a cooperar con las autoridades",
                "Verifica al menos $100 en gastos de bolsillo",
                "Asegúrate de que la solicitud se presente en 180 días del incidente",
                "Si eres menor de 18, coordina la firma del padre o tutor legal",
            ],
            ctaReady: "Continuar solicitud",
            ctaHelp: "Obtener ayuda de un defensor/a",
        },
        resultNotEligible: {
            headline: "Puedes no ser elegible según las reglas de Indiana.",
            body:
                "La elegibilidad suele requerir que seas la persona afectada, cónyuge sobreviviente o hijo dependiente; que lo ocurrido fue en Indiana; y que se cumplan otras reglas del programa. Contacta a ICJI al 1-800-353-1484.",
            nextSteps: [
                "Contacta al Instituto de Justicia Penal de Indiana al 1-800-353-1484",
                "Si el incidente ocurrió en otro estado, consulta el programa de compensación de ese estado",
            ],
            cta: "Encontrar otras opciones de apoyo",
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
        createApplicantAccount: "Crear cuenta de víctima",
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
        forgotPassword: "Olvidé mi contraseña",
        tooManyAttempts: "Demasiados intentos fallidos. Intente más tarde.",
    },

    forgotPassword: {
        title: "Restablecer contraseña",
        subtitle: "Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.",
        emailPlaceholder: "Correo electrónico",
        submit: "Enviar enlace",
        sending: "Enviando…",
        sentHint: "Revisa tu correo para el enlace. Puede tardar unos minutos.",
        backToLogin: "← Volver a iniciar sesión",
    },

    resetPassword: {
        title: "Establecer nueva contraseña",
        subtitle: "Ingresa tu nueva contraseña abajo.",
        newPasswordPlaceholder: "Nueva contraseña",
        confirmPasswordPlaceholder: "Confirmar contraseña",
        passwordsMismatch: "Las contraseñas no coinciden",
        passwordTooShort: "La contraseña debe tener al menos 6 caracteres",
        submit: "Actualizar contraseña",
        updating: "Actualizando…",
        backToLogin: "← Volver a iniciar sesión",
        invalidOrExpired: "Este enlace venció o ya no es válido.",
        invalidOrExpiredHint: "Los enlaces de restablecimiento caducan después de 1 hora. Solicita uno nuevo abajo.",
        requestNewLink: "Solicitar nuevo enlace",
        successTitle: "Contraseña actualizada",
        successHint: "Redirigiendo al inicio de sesión…",
    },

    /* =========================
       HOME PAGE
    ========================== */
    home: {
        hero: {
            title: "Compensación para víctimas — un solo centro",
            subtitle:
                "Procesa la Compensación para Víctimas de Delitos, revisa el estado y gestiona casos—una plataforma para personas sobrevivientes, defensoras y organizaciones.",
            disclaimer:
                "NxtStps es una herramienta de apoyo. No reemplaza asesoría legal, servicios de emergencia ni atención médica. Puedes pausar cuando quieras.",
            ctaCreateAccount: "Crear una cuenta",
            ctaMyDashboard: "Mi panel",
            signInPrompt: "¿Ya tienes cuenta?",
            videoTitle: "Cómo funciona",
            demoVideoIntro: "Resumen breve—cuando estés listo/a.",
        },

        newsletter: {
            title: "Boletín (opcional)",
            description:
                "Actualizaciones ocasionales sobre NxtStps y recursos para víctimas—nunca obligatorio para recibir ayuda.",
            placeholder: "tu@correo.com",
            submit: "Suscribirse",
            submitting: "…",
            subscribed: "Suscrito/a",
            thanks: "Gracias por suscribirte.",
            error: "No pudimos agregar tu correo. Revisa la dirección y tu conexión, e inténtalo de nuevo.",
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

        mkt: {
            nav: {
                exitSafely: "Salir con seguridad →",
                pilotLine: "Chicago, IL · Etapa piloto",
                howItWorks: "Cómo funciona",
                forAdvocates: "Para defensoras/es",
                problem: "El problema",
                about: "Acerca de",
                requestDemo: "Solicitar demo",
                startApplication: "Iniciar solicitud →",
                tryInteractiveDemo: "Probar demo",
                openMenu: "Abrir menú",
                closeMenu: "Cerrar menú",
                wordmark: "NxtStps",
            },
            hero: {
                eyebrow: "Compensación para víctimas de Illinois · Etapa piloto · Chicago, IL",
                headline: "Dar el siguiente paso no debería ser lo más difícil.",
                subhead:
                    "El 63% de las solicitudes de compensación para víctimas de delitos en Illinois son denegadas—muchas por motivos prevenibles: documentos faltantes, plazos perdidos, formularios incompletos. NxtStps está hecho para reducir esas barreras.",
                stat1Num: "63%",
                stat1Label: "de solicitudes denegadas",
                stat2Num: "281 días",
                stat2Label: "espera mediana para el pago",
                stat3Num: "3.677",
                stat3Label: "solicitudes anuales en IL",
                source:
                    "Fuente: estudio revisado por pares de 2025 sobre solicitudes CVC de Illinois (2012–2024, n=46.792).",
                ctaPrimary: "Iniciar mi solicitud →",
                ctaDemo: "Ver una demo en vivo ↓",
                ctaFootnote:
                    "Gratis para sobrevivientes y defensoras/es. No se requiere cuenta para probar la demo en esta página.",
                previewCaption: "↑ Así se ve. Prueba lo real abajo ↓",
                previewStepLabel: "Paso 2 de 7 · Unos 8 minutos restantes",
            },
            trust: {
                voca: "Basado en estándares VOCA y VAWA",
                compliance: "Cumplimiento primero, listo para GovTech",
                pilot: "Piloto con Iglesia Santa Cruz, Chicago, IL",
                trauma: "Diseño informado por trauma",
                encryption: "Cifrado AES-256 · servidores en EE. UU.",
            },
            demo: {
                label: "Demo en vivo",
                title: "Cómo funciona",
                subtitle: "Resumen breve—cuando estés listo/a. Recorrido interactivo completo próximamente.",
                disclaimer: "Modo demo · Solo video · Sin cuenta",
                walkthroughSoon: "Recorrido interactivo completo próximamente.",
            },
            interactiveDemo: {
                badge: "Demo en vivo",
                title: "Pruébalo ahora — sin cuenta",
                subtitle:
                    "Recorre los primeros pasos de una solicitud de compensación para víctimas en Illinois. Nada de lo que elijas aquí se guarda.",
                regionLabel: "Vista previa interactiva CVC Illinois",
                topBarLeft: "NxtStps · Demo CVC Illinois",
                topBarRight: "Modo demo · Sin datos guardados",
                progressLabel: "Pasos de la demo",
                prog1: "Elegibilidad",
                prog2: "Sobre el incidente",
                prog3: "Próximos pasos",
                s1Title: "Veamos si la CVC de Illinois podría aplicar",
                s1Sub:
                    "La compensación puede ayudar con gastos médicos, salarios perdidos, consejería y funerales tras ciertos delitos violentos. Esto es una vista previa — no es una decisión final de elegibilidad.",
                s1Q: "¿Fuiste afectado/a directamente por un delito violento en Illinois, o solicitas para un familiar?",
                s1O1: "Sí — solicito para mí",
                s1O2: "Sí — soy familiar y solicito para otra persona",
                s1O3: "Todavía no estoy seguro/a",
                s1Hint: "Puedes explorar sin elegir — o elige una respuesta para ver cómo cambia la guía.",
                s1Rv:
                    "Puede que estés en el lugar correcto. La CVC de Illinois cubre muchos gastos para sobrevivientes elegibles. Te ayudamos a ver qué reunir.",
                s1Rf:
                    "En algunas situaciones los familiares pueden calificar — por ejemplo si alguien murió o resultó gravemente herido. Estás en el lugar adecuado para aprender qué aplica.",
                s1Ru:
                    "Es común. Unas preguntas más aclaran si la CVC es una opción — aquí no hay respuesta incorrecta.",
                toStep2: "Continuar al paso 2 →",
                skipReal: "Saltar la demo — iniciar mi solicitud real →",
                back: "← Atrás",
                s2Title: "Cuéntanos sobre el reporte",
                s2Ctx:
                    "Illinois suele esperar cooperación con las autoridades. Explicamos qué cuenta como reporte y qué hacer si aún no tienes documentos.",
                s2Q: "¿Se reportó el delito a la policía (u otra autoridad)?",
                s2O1: "Sí — ya está reportado",
                s2O2: "Todavía no",
                s2O3: "No estoy seguro/a",
                s2Ry:
                    "Bien. Necesitarás un número de reporte o caso al solicitar — te mostraremos dónde va en el formulario.",
                s2Rn:
                    "Illinois generalmente espera reporte en 72 horas, con excepciones importantes — por ejemplo agresión sexual, violencia doméstica y otras situaciones.",
                s2RnNote: "Aún puedes empezar si pasó el plazo — te ayudamos a explicar tu situación.",
                s2Ru:
                    "Está bien. Un reporte policial, una orden de protección o documentación hospitalaria o de refugio puede contar. Te ayudamos a ver qué tienes.",
                toStep3: "Ver próximos pasos →",
                s3Title: "Esto suele implicar una solicitud real",
                s3Intro: "Según tus respuestas de la demo, una lista de ejemplo — no es asesoría legal y no se guarda.",
                s3L1: "Reporte policial o número de caso",
                s3L2: "Facturas médicas (si reclamas gastos médicos)",
                s3L3: "Prueba de salarios perdidos (si aplica)",
                s3L4: "Documentación de parentesco (solicitudes familiares)",
                s3EstTitle: "Tiempos orientativos",
                s3Est1Label: "Tiempo estimado para completar",
                s3Est1Val: "15–25 minutos",
                s3Est2Label: "Trámite típico con solicitud organizada",
                s3Est2Val: "A menudo varios meses",
                s3Est3Label: "Mediana en Illinois (datos del estudio)",
                s3Est3Val: "281 días hasta el pago",
                s3CtaStart: "Iniciar mi solicitud real →",
                s3CtaHelp: "Pedir ayuda de un defensor o defensora",
                s3Disclaimer: "Esta vista previa es solo para aprender. No guardamos lo que seleccionaste.",
                restart: "Reiniciar demo",
            },
            videoTour: {
                title: "Recorrido en video",
                intro: "¿Prefieres mirar primero? Esta grabación muestra la plataforma en acción.",
                noHtml5: "Tu navegador no reproduce video incrustado. Usa el enlace para abrir el archivo.",
                loadError: "No pudimos reproducir el video en el navegador.",
                missingFileHint:
                    "Añade public/mvp-demo.mp4 o define NEXT_PUBLIC_MARKETING_DEMO_VIDEO_URL con una URL HTTPS del MP4. En iPhone, usa H.264/AAC y “fast start” (moov al inicio).",
                openDirect: "Abrir video en una pestaña nueva",
            },
            audiences: {
                title: "Para todas las personas del ecosistema de servicios a víctimas",
                tabSurvivors: "Sobrevivientes y familias",
                tabAdvocates: "Defensoras/es",
                tabCbos: "CBO y organizaciones",
                tabHospitals: "Hospitales y clínicas",
                tabState: "Agencias estatales",
                survivorsTitle: "Mereces apoyo — acercarlo es nuestro trabajo",
                survivorsBody:
                    "El proceso de CVC en Illinois no fue diseñado para crisis. NxtStps ofrece pasos claros, lenguaje sencillo, ayuda con documentos y camino para conectar con un defensor o defensora.",
                survivorsCta: "Iniciar mi solicitud →",
                survivorsB1: "Revisar elegibilidad en minutos",
                survivorsB2: "Solicitar en inglés o español",
                survivorsB3: "Guardar y volver cuando quieras",
                survivorsB4: "Entender por qué pide cada documento",
                survivorsB5: "Ver el estado en un solo lugar",
                survivorsB6: "Conectar con defensor/a cuando quieras",
                advocatesTitle: "Menos papeleo — casos más claros",
                advocatesBody:
                    "NxtStps ayuda a gestionar casos con menos carga administrativa y paquetes más completos para el estado — para enfocarte en las personas.",
                advocatesCta: "Solicitar una demo →",
                advocatesB1: "Menos captura repetitiva de datos",
                advocatesB2: "Mayor integridad antes de enviar",
                advocatesB3: "Alertas de faltantes antes de denegaciones",
                advocatesB4: "Vista de caseload",
                advocatesB5: "Recordatorios en un solo espacio",
                advocatesB6: "Exportaciones útiles para informes de subvenciones",
                cbosTitle: "Un solo espacio para tu programa",
                cbosBody:
                    "Menos hojas de cálculo dispersas y correos — un sistema pensado en programas financiados con VOCA.",
                cbosCta: "Hablemos de pilotos →",
                cbosB1: "Varias personas y programas",
                cbosB2: "Historial útil para informes",
                cbosB3: "Seguimiento de resultados para fondos",
                cbosB4: "Derivaciones y entregas cálidas",
                cbosB5: "Documentación que resiste revisión",
                cbosB6: "Transparencia ante agencias administradoras",
                hospitalsTitle: "Iniciar el camino desde la cama",
                hospitalsBody:
                    "Trabajadores sociales y especialistas pueden ayudar a empezar temprano — preservando plazos y reduciendo confusiones de facturación.",
                hospitalsCta: "Hablemos de hospitales →",
                hospitalsB1: "Inicio temprano que preserva ventanas",
                hospitalsB2: "Rutas claras para facturas y registros",
                hospitalsB3: "Manejo cuidadoso de información de salud",
                hospitalsB4: "Útil para equipos de atención",
                hospitalsB5: "Menos idas y vueltas con facturación",
                hospitalsB6: "Ayuda a acceder a ayudas posibles",
                stateTitle: "Solicitudes más limpias — menos idas y vueltas",
                stateBody:
                    "Infraestructura con cumplimiento primero: paquetes con mejor documentación y menos vacíos prevenibles.",
                stateCta: "Hablemos de su programa →",
                stateB1: "Arquitectura alineada con VOCA / VAWA",
                stateB2: "Comprobaciones contra causas comunes de denegación",
                stateB3: "Datos estructurados para informes federales",
                stateB4: "Diseño con lecciones de auditorías públicas",
                stateB5: "Ruta de integración a medida que madure el programa",
                stateB6: "Vistas agregadas para supervisión (cuando aplique)",
            },
            denial: {
                label: "Prevención de denegaciones",
                title: "Muchas denegaciones son prevenibles — ayudamos a detectarlas antes",
                body:
                    "Gran parte de las denegaciones en Illinois se relacionan con documentación, tiempos y proceso — no con falta de elegibilidad. NxtStps conecta causas comunes con comprobaciones concretas antes de enviar.",
                d1Reason: "Documentación faltante",
                d1Fix: "Lista inteligente que se ajusta según tus respuestas",
                d1Tag: "Antes de enviar",
                d2Reason: "Presentación tardía",
                d2Fix: "Contexto de plazos y guía cuando el tiempo aprieta",
                d2Tag: "Antes de enviar",
                d3Reason: "Solicitud incompleta",
                d3Fix: "Validación en línea y cruces antes de enviar nada",
                d3Tag: "Antes de enviar",
                d4Reason: "Seguimiento perdido",
                d4Fix: "Recordatorios de tareas abiertas",
                d4Tag: "Antes de enviar",
                d5Reason: "Gastos posiblemente no cubiertos",
                d5Fix: "Indicaciones de cobertura antes de enviar",
                d5Tag: "Antes de enviar",
                d6Reason: "Sin respuesta del proveedor",
                d6Fix: "Solicitudes de documentos con seguimiento",
                d6Tag: "Antes de enviar",
                docHint: "Consulta Ayuda para documentación y políticas del producto.",
            },
            problem: {
                label: "El problema",
                title: "El sistema de compensación para víctimas en Illinois está bajo presión.",
                body:
                    "Muchas denegaciones no se deben a que la persona no sea elegible, sino a fricción del proceso: documentos faltantes, requisitos confusos, plazos y poca orientación clara. NxtStps ayuda a presentar solicitudes más completas y coherentes.",
                card1Eyebrow: "Estudio revisado por pares (2025)",
                card1Stat: "63%",
                card1Desc:
                    "de las solicitudes CVC de Illinois en el periodo del estudio fueron denegadas—muchas por motivos administrativos prevenibles.",
                card2Eyebrow: "Estudio revisado por pares (2025)",
                card2Stat: "281 días",
                card2Desc: "tiempo mediano entre la solicitud y el pago en los datos del estudio.",
                card3Eyebrow: "Auditoría federal DOJ OIG (2024)",
                card3Stat: "$125K",
                card3Desc:
                    "en costos cuestionados citados en la auditoría federal de subvenciones de compensación a víctimas en Illinois—incluye procesos manuales y temas de certificación, según el informe público.",
                sources:
                    "Fuentes: estudio revisado por pares de 2025 (2012–2024, n=46.792) · auditoría DOJ OIG de 2024 (hallazgos públicos).",
            },
            how: {
                label: "Cómo funciona",
                title: "Del primer contacto a la solicitud presentada",
                step1Title: "Encuentra la organización adecuada",
                step1Body:
                    "Las personas sobrevivientes pueden descubrir organizaciones de servicios a víctimas por ubicación y conectar con el programa que elijan—sin asignación automática.",
                step2Title: "Conecta con un defensor o una defensora",
                step2Body:
                    "Solicitudes de apoyo y mensajes seguros ayudan a coordinar en un solo lugar.",
                step3Title: "Completa la solicitud guiada",
                step3Body:
                    "Orientación paso a paso para la compensación en Illinois, en lenguaje claro—con guardar y volver.",
                step4Title: "Comprobaciones automáticas contra denegaciones",
                step4Body:
                    "Antes de enviar, el producto señala vacíos comunes — documentos, inconsistencias y tiempos — para corregirlos a tiempo.",
                step5Title: "Envía y sigue coordinando",
                step5Body:
                    "Las solicitudes completas van al programa estatal; sobrevivientes y defensoras/es siguen el estado en un solo espacio.",
            },
            convert: {
                title: "¿Listo/a para verlo en acción?",
                subtitle: "Sobrevivientes, defensoras/es, inversores/as y socios de agencias—elige tu camino.",
                survivorsTitle: "Inicia tu solicitud",
                survivorsBody: "Gratis y confidencial. Enfoque en Illinois hoy.",
                survivorsCta: "Comenzar →",
                demoTitle: "Solicitar una demo",
                demoBody: "Defensoras/es, CBOs, hospitales—ve el flujo de trabajo.",
                demoName: "Nombre",
                demoOrg: "Organización",
                demoEmail: "Correo",
                demoRole: "¿Qué te describe mejor?",
                demoRoleAdvocate: "Defensor/a",
                demoRoleCbo: "Personal de CBO",
                demoRoleHospital: "Trabajador/a social hospitalario",
                demoRoleLe: "Aplicación de la ley",
                demoRoleOther: "Otro",
                demoSubmit: "Solicitar demo",
                demoThanks: "Gracias—nos pondremos en contacto en 24 horas.",
                investorsTitle: "Habla con el equipo",
                investorsBody: "Inversores/as, aceleradoras y agencias estatales—conversemos.",
                scheduleCta: "Agendar una conversación →",
                emailLine: "contact@nxtstps.org",
                seedLine: "NxtStps está levantando una ronda seed.",
            },
            about: {
                label: "Acerca de",
                title: "Piloto y equipo",
                pilotLabel: "Socio piloto actual",
                pilotName: "Iglesia Santa Cruz",
                pilotAddr: "6545 S Springfield Ave, Chicago, IL 60629",
                pilotDesc:
                    "Organización comunitaria de base religiosa en el suroeste de Chicago que sirve a un vecindario predominantemente latino.",
                pilotStatus: "MOU firmado · Piloto activo",
                pilotTargets:
                    "Metas del piloto: alta integridad de solicitudes y menos carga administrativa para defensoras/es—medido con el socio.",
                pilotCtaIntro: "¿Interés en un piloto?",
                pilotCta: "Solicitar asociación piloto →",
                teamHeading: "Construido por personas cercanas al trabajo",
                teamBody:
                    "La idea nació del trabajo de primera línea: casos donde el idioma y el proceso impedían acceder a compensaciones posibles. NxtStps une esa experiencia con ingeniería de producto y cumplimiento—primero la CVC de Illinois.",
                founder1Name: "Sam Brandstrader",
                founder1Role: "CEO",
                founder1Bio: "Servicios a víctimas y CVI; ex Director Asistente de Programa, SWOP.",
                founder2Name: "Charlie Foreman",
                founder2Role: "CTO",
                founder2Bio: "Arquitectura de plataforma, sistemas e infraestructura de cumplimiento.",
                founder3Name: "Armando Mancilla",
                founder3Role: "CPO",
                founder3Bio: "Casework CVI activo; guía el producto desde la primera línea.",
                founder4Name: "Christina Rice",
                founder4Role: "CSO",
                founder4Bio: "Liderazgo en organizaciones sin fines de lucro y estrategia.",
                companyLine: "NxtStps, LLC · Chicago, IL · Fundada en 2025 · Etapa piloto",
            },
            footerMkt: {
                tagline: "Infraestructura de servicios a víctimas con cumplimiento primero.",
                pilotLine: "Chicago, IL · Fundada 2025 · Etapa piloto",
                expanding: "Piloto en Illinois. Expansión nacional.",
                colPlatform: "Plataforma",
                linkHow: "Cómo funciona",
                linkSurvivors: "Para sobrevivientes",
                linkAdvocates: "Para defensoras/es",
                linkOrgs: "Para organizaciones",
                linkDemo: "Solicitar demo",
                linkAbout: "Acerca de NxtStps",
                colLegal: "Legal",
                linkTerms: "Términos de uso",
                linkPrivacy: "Política de privacidad",
                linkHelp: "Ayuda",
                colSupport: "Apoyo",
                linkContact: "Contáctanos",
                linkPilot: "Asociaciones piloto",
                crisisIf: "Si necesitas apoyo:",
                crisis988: "Línea 988: llama o envía texto al 988",
                crisisText: "Línea de crisis por texto: envía HOME al 741741",
                crisis911: "Emergencia: 911",
                bottomCopy: "© {year} NxtStps, LLC · Chicago, Illinois · Todos los derechos reservados",
                bottomChips: "VOCA · VAWA · HIPAA-adjunto · CJIS-aware · WCAG 2.2 AA",
            },
            stickyCrisis: "Apoyo: 988 (llamada o texto) · Crisis por texto: HOME al 741741",
        },
    },

    /* =========================
       INTAKE (APPLICATION FLOW)
    ========================== */
    intake: {
        stepOf: "Paso {current} de {total}",
        reassurance: "Puedes guardar y volver cuando quieras.",
        steps: {
            victim: "Persona afectada",
            applicant: "Solicitante",
            crime: "Incidente y detalles",
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
            title: "Tu solicitud",
            subtitle:
                "Tu solicitud guiada de compensación para víctimas del delito: responde lo que puedas y pausa cuando quieras.",
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
            continue: "Continuar",
            saveAndExit: "Guardar y salir",
            reviewSubmit: "Revisar y enviar",
        },

        viewOnlyBanner:
            "Acceso de solo lectura: puedes revisar este caso, pero no puedes editarlo.",

        footer: {
            draftDisclaimer:
                "Borrador. Nada se envía al estado sin tu consentimiento. Puedes guardar y volver cuando quieras.",
        },

        pathwaySafety: {
            supportResourcesLabel: "Recursos de apoyo",
            supportIntro: "Si necesitas apoyo ahora mismo:",
            crisis988: "Línea 988 de prevención del suicidio y crisis: llama o envía texto al 988",
            crisisText: "Línea de crisis por texto: envía HOME al 741741",
            crisis911: "Emergencia: 911",
            exitSafelyCta: "Salir con seguridad →",
            autosaveTrouble:
                "Tenemos problemas para guardar tu avance. No te preocupues — sigue y lo intentaremos de nuevo.",
            saveReturnToast:
                "Tu avance está guardado. Vuelve cuando quieras — todo seguirá donde lo dejaste.",
            autoSaved: "Guardado",
            sensitiveSectionHint:
                "Esta sección tiene pocas preguntas. Tómate tu tiempo — puedes omitir y volver después.",
            groundingBody:
                "Tómate todo el tiempo que necesites. Tu avance está guardado. Hay apoyo si lo necesitas: llama o envía texto al 988.",
            groundingContinue: "Continuar",
            groundingNeedSupport: "Necesito apoyo",
        },

        summary: {
            alreadyFinalReview: "Ya estás en el paso final de revisión.",
        },

        viewOnly: "Acceso de solo lectura (no puedes editar este caso).",
        startFailed: "No se pudo iniciar la solicitud. Intenta recargar.",
        missingCaseId: "Se creó, pero falta el ID del caso.",
        started: "Solicitud iniciada",

        loadCase: {
            failed:
                "No pudimos abrir ese caso — puede que no tengas acceso o el enlace no sea correcto. Vuelve a tu panel y elige un caso de tu lista.",
            unexpected:
                "No pudimos cargar ese caso porque algo interrumpió la solicitud. Revisa tu conexión, actualiza la página e inténtalo de nuevo.",
        },

        save: {
            viewOnly: "Acceso de solo lectura. No puedes guardar cambios.",
            noCaseLoaded: "Aún no hay un caso cargado. Inicia la solicitud primero.",
            saved: "Solicitud guardada",
            failed:
                "No pudimos guardar tu solicitud — el servidor puede estar ocupado. Espera un momento, actualiza la página e inténtalo de nuevo.",
        },

        pdf: {
            summaryFailed:
                "No pudimos generar el PDF de resumen — el servidor puede haber tardado demasiado. Espera un momento e inténtalo de nuevo, o descarga después de guardar.",
            summaryUnexpected:
                "No pudimos terminar el PDF de resumen. Revisa tu conexión, actualiza la página e inténtalo de nuevo.",
            officialFailed:
                "No pudimos generar el formulario oficial de Illinois en PDF. Espera un momento e inténtalo de nuevo — si sigue fallando, contacta a soporte.",
            officialUnexpected:
                "No pudimos terminar el PDF del formulario oficial. Revisa tu conexión, actualiza la página e inténtalo de nuevo.",
        },

        safeMode: {
            takeYourTime: "Tómate tu tiempo. Puedes volver a esto más tarde.",
            crimeDescription:
                "Puedes omitir esto por ahora o responder solo con lo que te sientas cómodo compartiendo.",
            injuryDescription:
                "Puedes omitir esto por ahora o responder solo con lo que te sientas cómodo compartiendo.",
            optionalDetail: "Puedes omitir esto por ahora o responder más tarde.",
        },

        skipForNow: "Omitir por ahora",
        answerLater: "Responder más tarde",

        explainThis: "Explicar esto",
        explainThisNeedHelp: "¿Necesitas ayuda para entender qué pedimos?",

        review: {
            missing: "Falta",
            skipped: "Omitido por ahora",
            deferred: "Responder más tarde",
            editSection: "Editar sección",
            completenessNote:
                "Algunos campos son opcionales o se pueden omitir. Los obligatorios se listan abajo.",
        },

        validation: {
            applicantRequired:
                "Por favor completa las preguntas del solicitante y de contacto en este paso antes de continuar (incluido el idioma y los datos del defensor si trabajas con alguien).",
            victimRequired:
                "Agrega el nombre, la fecha de nacimiento y la dirección de la persona afectada antes de continuar.",
            completeApplicantFirst:
                "Completa primero el paso Solicitante. Después podrás avanzar por el resto del formulario.",
            completeVictimBeforeOther:
                "Termina el paso Persona afectada antes de abrir Incidente y detalles o secciones posteriores.",
            crimeMinimumRequired:
                "Agrega al menos la fecha del incidente, dónde ocurrió y a qué departamento de policía lo reportaste.",
            certificationRequired:
                "Antes de guardar esto como caso, abre la certificación y agrega tu nombre, fecha y las casillas — confirman que revisaste las declaraciones.",
        },

        requiredBeforeContinue: {
            modalTitle: "Aún falta esto antes de continuar",
            close: "Cerrar",
            viewRequiredItems: "¿Qué falta?",
            reviewApplication: "Revisar solicitud",
            reviewModeBanner:
                "Modo revisión: avanza en orden con Continuar. Las pestañas están bloqueadas hasta terminar.",
            ackLossesNone: "Confirmo que no tengo categorías de pérdida que reclamar en este paso",
            ackEmploymentNoEmployer:
                "Confirmo que no tengo un empleador que agregar (o lo agregaré arriba antes de continuar)",
            ackFuneralContinue:
                "Continuaré sin datos funerarios por ahora (o los agregaré arriba)",
            contactPreferredLanguage: "Idioma preferido (cuando no usas inglés)",
            advocateName: "Nombre del defensor u organización (indicaste que trabajas con alguien)",
            advocatePhone: "Teléfono del defensor",
            applicantFirstName: "Nombre del solicitante",
            applicantLastName: "Apellido del solicitante",
            applicantDateOfBirth: "Fecha de nacimiento del solicitante",
            applicantRelationship: "Relación con la persona afectada",
            applicantStreet: "Dirección del solicitante",
            applicantCity: "Ciudad del solicitante",
            applicantState: "Estado del solicitante",
            applicantZip: "Código postal del solicitante",
            applicantLast4Ssn: "Últimos 4 dígitos del SSN del solicitante (Indiana)",
            applicantSeekingOwnExpenses: "Si buscas tus propios gastos (sí o no)",
            victimFirstName: "Persona afectada — nombre",
            victimLastName: "Persona afectada — apellido",
            victimDateOfBirth: "Persona afectada — fecha de nacimiento",
            victimStreet: "Persona afectada — dirección",
            victimCity: "Persona afectada — ciudad",
            victimZip: "Persona afectada — código postal",
            victimState: "Persona afectada — estado",
            victimLast4Ssn: "Persona afectada — últimos 4 dígitos del SSN (Indiana)",
            whoIsSubmitting: "Quién presenta la solicitud (Indiana)",
            crimeDate: "Fecha del incidente",
            crimeAddress: "Lugar / dirección donde ocurrió el incidente",
            crimeCity: "Ciudad donde ocurrió el incidente",
            reportingAgency: "Agencia a la que reportaste el incidente",
            selectLossCategory:
                "Selecciona al menos una categoría de pérdida, o confirma abajo que no aplica ninguna",
            medicalProviderName:
                "Nombre del proveedor médico o de consejería (para las pérdidas que seleccionaste)",
            employmentEmployerOrConfirm:
                "Al menos un nombre de empleador por pérdida de ingresos, o confirma abajo",
            funeralDetailsOrConfirm:
                "Funeraria o monto de la factura por pérdidas funerarias, o confirma abajo",
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
                "No pudimos guardar tu caso — algo interrumpió el servidor. Espera un momento, actualiza la página e inténtalo de nuevo. Si sigue pasando, contacta a soporte.",
            missingId:
                "Tu caso puede haberse guardado, pero no recibimos un ID. Actualiza la página — si falta el caso, intenta guardar otra vez.",
            unexpected:
                "No pudimos terminar de guardar tu caso. Revisa tu conexión, actualiza la página e inténtalo de nuevo.",
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
            generic:
                "No pudimos terminar esa solicitud—algo la interrumpió. Revisa tu conexión, actualiza la página e inténtalo de nuevo.",
            network:
                "No pudimos contactar al servidor. Revisa tu conexión, espera un momento e inténtalo de nuevo.",
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
        int: {
            whoIsSubmitting: "¿Quién presenta la reclamación?",
            whoOptions: {
                victim: "Persona afectada",
                claimant: "Reclamante",
                advocate: "Defensor/a",
            },
            last4SSN: "Últimos 4 dígitos del SSN o Tax ID",
            autoAccident: "¿Es un accidente automovilístico?",
            autoInsuranceName: "Nombre del seguro de auto",
            physicalInjuries: "¿La persona afectada tiene lesiones físicas?",
            medicalFacilityName: "Nombre del centro médico de tratamiento",
            timeOfCrime: "Hora en que ocurrió el crimen",
            crimeType: "Tipo de crimen",
            causeNumber: "Número de causa",
            willingToAssistProsecution: "¿Está dispuesto/a a colaborar con las autoridades en el proceso?",
            notWillingExplain: "Si no está dispuesto/a a colaborar (explique por qué)",
            compensationRequesting: "¿Qué formas de compensación solicita?",
            medicalDentalCounseling: "Médico / dental / consejería",
            lossOfIncome: "Pérdida de ingresos",
            funeralBurial: "Funeral / entierro",
            lossOfSupport: "Pérdida de apoyo",
            other: "Otro",
            otherDescribe: "Otro (describa)",
        },
        victim: {
            title: "Información de la persona afectada",
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
                idProof: "Identificación (persona afectada / solicitante)",
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
            isApplicantAlsoApplicantLabel: "¿La persona afectada también es el solicitante?",
            sameAsVictimNote:
                "En el siguiente paso ingresarás los datos de la persona afectada; los copiaremos al solicitante al continuar a Incidente y detalles.",

            options: {
                victim: "Yo fui quien sufrió el daño (igualaremos los datos del solicitante después de ingresar esa información)",
                proxy:
                    "Estoy solicitando para alguien que sufrió el daño (padre/madre, cónyuge, otro)",
            }, // <-- IMPORTANT COMMA HERE

            relationshipPlaceholder: "Padre/madre, cónyuge, hermano/a, amigo/a...",

            legalGuardianship: {
                question:
                    "Si la persona afectada es menor de edad o un adulto incapacitado, ¿tienes tutela legal?",
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

            dateOfCrimeLabel: "Fecha del incidente *",
            dateReportedLabel: "Fecha en que se reportó el incidente",

            crimeAddressLabel:
                "¿Dónde ocurrió el incidente? (dirección o lugar aproximado) *",

            crimeCityLabel: "Ciudad *",
            crimeCountyLabel: "Condado",

            reportingAgencyLabel:
                "Departamento de policía al que reportaste el incidente *",
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
                "Relación con la persona afectada, si existe",
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
                hasMedicalTreatment: "¿La persona afectada recibió atención médica?",
                hasCounseling: "¿La persona afectada recibió consejería / terapia?",
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
                "Revisa lo que ingresaste y tu próximo paso. Puedes editar cualquier sección cuando quieras.",
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

            checkpoint: {
                progressTitle: "Progreso de la solicitud",
                progressHint:
                    "Has llegado a {visited} de {total} secciones en esta solicitud (incluye esta revisión).",
                missingTitle: "Información faltante",
                missingExplainer: "Los datos faltantes pueden retrasar el avance.",
                missingEmpty: "No hay campos obligatorios faltantes en este punto.",
                deferredTitle: "Aplazado / omitido",
                deferredExplainer: "Lo omitido o aplazado se puede completar más adelante.",
                deferredEmpty: "No hay elementos marcados como omitidos o aplazados.",
                nextStepTitle: "Tu próximo paso",
                applicationDetailsTitle: "Detalles de la solicitud",
                applicationDetailsToggle: "Ver detalles completos de la solicitud",
                documentsTitle: "Documentos",
                documentsSubtitle: "Los documentos pueden ayudar a respaldar tu caso.",
                documentsEmpty:
                    "Aún no hay documentos cargados. Ve al paso de documentos y sube archivos—los verás aquí.",
                uploadDocuments: "Cargar documentos",
                uploadMissingDocuments: "Cargar documentos faltantes",
                messagesTitle: "Mensajes",
                messagesSubtitle: "Conversación segura con tu defensor/a",
                messagesEmpty: "Aún no tienes mensajes seguros.",
                messagesOpenTool:
                    "La mensajería segura está en la página Mensajes—ábrela cuando quieras leer o responder sin salir del resumen de tu solicitud.",
                messagesOpenToolCta: "Abrir mensajes",
                appointmentsTitle: "Citas",
                appointmentsSubtitle: "Próximas citas de apoyo",
                appointmentsEmpty: "Aún no hay citas programadas.",
                appointmentsCta: "Ver citas",
                recommendedTitle: "Organizaciones de apoyo recomendadas",
                whatNextTitle: "Qué sigue",
                whatNextIncomplete:
                    "Continúa tu solicitud cuando estés listo/a. Puedes guardar y volver en cualquier momento.",
                whatNextMaybeDocsAndMessages:
                    "Tus próximos pasos pueden incluir cargar documentos o revisar mensajes.",
                whatNextSupportOrgs:
                    "Puedes revisar organizaciones de apoyo que coincidan con tus necesidades cuando quieras.",
                whatNextAllClear:
                    "Por ahora estás al día. Vuelve más tarde por actualizaciones o mensajes.",
                viewMessages: "Ver mensajes",
            },

            actions: {
                downloadSummaryPdf: "Descargar PDF de resumen",
                downloadOfficialIlPdf: "Descargar formulario oficial de CVC de Illinois",
                // Alias para la clave usada en SummaryView
                downloadOfficialIl: "Descargar formulario oficial de CVC de Illinois",
                downloadOfficialIn: "Descargar formulario oficial de CVC de Indiana",
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
                    mustBeLoggedIn: "Inicia sesión para invitar a un defensor.",
                    unexpected:
                        "No pudimos enviar esa invitación. Actualiza la página e inténtalo de nuevo.",
                    accessGranted:
                        "✅ Acceso otorgado.\nComparte este enlace con el defensor:\n{url}",
                },

                // Forma común usada en componentes
                errors: {
                    saveCaseFirst:
                        "Primero guarda esto como un caso para poder generar un enlace seguro de invitación.",
                    mustBeLoggedIn: "Inicia sesión para invitar a un defensor.",
                    unexpected:
                        "No pudimos enviar esa invitación. Actualiza la página e inténtalo de nuevo.",
                },
                success: {
                    accessGranted:
                        "✅ Acceso otorgado.\nComparte este enlace con el defensor:\n{url}",
                },
            },

            snapshots: {
                victimTitle: "Persona afectada",
                applicantTitle: "Solicitante",
                applicantSamePerson:
                    "La persona afectada y el solicitante son la misma persona.",

                crimeTitle: "Resumen del incidente",
                crime: {
                    dateOfCrime: "Fecha del incidente",
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
                title: "Resumen del incidente",
                // Alias para claves planas usadas en SummaryView (forms.summary.crime.*)
                dateOfCrime: "Fecha del incidente",
                location: "Lugar",
                cityCounty: "Ciudad / Condado",
                reportedTo: "Reportado a",
                policeReportNumber: "N.º de reporte policial",
                fields: {
                    dateOfCrime: "Fecha del incidente",
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
                victim: "Persona afectada",
                applicant: "Solicitante",
                crime: "Incidente / detalles",
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
                isApplicantAlsoApplicant: "La persona afectada también es solicitante",
                relationshipToVictim: "Relación con la persona afectada",
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

    accountAdvocate: {
        title: "Perfil de defensor/a",
        intro:
            "Esta información ayuda a sobrevivientes y a tu organización a identificarte. La organización la gestiona tu equipo—aparece aquí cuando tu cuenta está vinculada.",
        privacyNote: "No recopilamos SSN ni datos fiscales aquí.",
        organizationSection: "Organización",
        organizationHelp:
            "Tu empleador o programa lo define el administrador de tu organización. Contacta si algo no cuadra.",
        organizationName: "Organización",
        organizationEmpty: "Aún sin organización vinculada",
        identitySection: "Nombre y rol",
        preferredName: "Nombre preferido (cómo quieres que te llamemos)",
        legalFirstName: "Nombre legal",
        legalLastName: "Apellido legal",
        jobTitle: "Cargo / rol",
        workLocationSection: "Ubicación laboral",
        workCity: "Ciudad",
        workState: "Estado",
        workZip: "Código postal",
        contactSection: "Contacto laboral",
        workPhone: "Teléfono del trabajo",
        workPhoneExt: "Extensión",
        alternatePhone: "Teléfono alternativo",
        preferredContactMethod: "Método de contacto preferido",
        contactSelect: "Elegir…",
        contactEmail: "Correo",
        contactPhone: "Llamada",
        contactSms: "SMS",
        safeToLeaveVoicemail: "¿Es seguro dejar un mensaje de voz en el número del trabajo?",
        interpreterYes: "Sí",
        interpreterNo: "No",
        interpreterUnspecified: "Prefiero no decir",
        languagesSection: "Idiomas",
        languages: "Idiomas en los que trabajas",
        languagesPlaceholder: "p. ej. inglés, español",
        save: "Guardar perfil",
        saving: "Guardando…",
        saved: "Guardado.",
        saveError: "No se pudo guardar. Inténtalo de nuevo.",
        notSignedIn: "No has iniciado sesión.",
    },

    accountPersonal: {
        title: "Información personal",
        intro:
            "Esta información se guarda en tu cuenta. Tu defensor y las organizaciones que trabajan contigo en un caso pueden verla cuando la necesiten.",
        privacyNote: "Nunca recopilamos números de Seguro Social en este formulario.",
        identitySection: "Nombre e identidad",
        demographicsSection: "Datos demográficos",
        addressSection: "Dirección",
        contactSection: "Contacto",
        otherSection: "Trabajo, idioma y accesibilidad",
        preferredName: "Nombre preferido",
        legalFirstName: "Nombre legal",
        legalLastName: "Apellido legal",
        pronouns: "Pronombres",
        genderIdentity: "Identidad de género",
        dateOfBirth: "Fecha de nacimiento",
        ethnicity: "Etnicidad",
        race: "Raza",
        streetAddress: "Dirección",
        apt: "Depto. / unidad",
        city: "Ciudad",
        state: "Estado",
        zip: "Código postal",
        cellPhone: "Teléfono celular",
        alternatePhone: "Teléfono alternativo",
        preferredContactMethod: "Forma de contacto preferida",
        contactEmail: "Correo electrónico",
        contactPhone: "Llamada",
        contactSms: "Mensaje de texto (SMS)",
        contactAny: "Sin preferencia",
        safeToLeaveVoicemail: "¿Puede dejarse mensaje de voz?",
        occupation: "Ocupación",
        educationLevel: "Educación",
        primaryLanguage: "Idioma principal",
        interpreterNeeded: "¿Necesita intérprete?",
        interpreterYes: "Sí",
        interpreterNo: "No",
        interpreterUnspecified: "Prefiero no decir",
        disabilityOrAccessNeeds: "Discapacidad o necesidades de acceso",
        eduLessThanHs: "Menos que secundaria",
        eduHsGed: "Secundaria / GED",
        eduSomeCollege: "Algo de universidad",
        eduAssociates: "Título de asociado",
        eduBachelors: "Licenciatura",
        eduGraduate: "Posgrado",
        eduPreferNot: "Prefiero no decir",
        eduSelect: "Seleccionar…",
        save: "Guardar",
        saving: "Guardando…",
        saved: "Guardado.",
        loadError: "No se pudo cargar tu información.",
        saveError: "No se pudo guardar. Revisa los datos e inténtalo de nuevo.",
        notSignedIn: "No has iniciado sesión.",
    },
}; // closes es