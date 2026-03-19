/**
 * ============================================
 * SISTEMA DE RECORDATORIOS - GOOGLE APPS SCRIPT
 * Version: 1.0
 * Compatible con editor antiguo
 * ============================================
 */

// ============================================
// CONFIGURACION INICIAL
// ============================================

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Recordatorios')
    .addItem('Abrir Panel Web', 'abrirPanelWeb')
    .addItem('Crear Hojas Necesarias', 'crearHojas')
    .addItem('Enviar Recordatorios de Hoy', 'ejecutarEnvioDiario')
    .addItem('Probar Telegram', 'probarTelegram')
    .addItem('Probar Email', 'probarEmail')
    .addSeparator()
    .addItem('Configuracion', 'abrirConfiguracion')
    .addToUi();
}

function abrirPanelWeb() {
  var html = HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Sistema de Recordatorios')
    .setWidth(1200)
    .setHeight(800)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  SpreadsheetApp.getUi().showModalDialog(html, 'Sistema de Recordatorios');
}

function abrirConfiguracion() {
  var html = HtmlService.createHtmlOutputFromFile('Config')
    .setTitle('Configuracion')
    .setWidth(600)
    .setHeight(500);
  SpreadsheetApp.getUi().showModalDialog(html, 'Configuracion');
}

// ============================================
// CREAR HOJAS AUTOMATICAMENTE
// ============================================

function crearHojas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  
  // Hoja: Recordatorios
  var hojaRecordatorios = ss.getSheetByName('Recordatorios');
  if (!hojaRecordatorios) {
    hojaRecordatorios = ss.insertSheet('Recordatorios');
    hojaRecordatorios.appendRow([
      'ID', 'Nombre', 'Email', 'Telegram_ID', 'Fecha', 'Hora', 
      'Asunto', 'Mensaje', 'Estado', 'Enviado_Email', 'Enviado_Telegram',
      'Activo', 'Creado'
    ]);
    hojaRecordatorios.getRange(1, 1, 1, 13).setFontWeight('bold').setBackground('#f59e0b').setFontColor('#ffffff');
    hojaRecordatorios.setFrozenRows(1);
    ui.alert('Hoja "Recordatorios" creada correctamente');
  } else {
    ui.alert('La hoja "Recordatorios" ya existe');
  }
  
  // Hoja: Configuracion
  var hojaConfig = ss.getSheetByName('Configuracion');
  if (!hojaConfig) {
    hojaConfig = ss.insertSheet('Configuracion');
    hojaConfig.appendRow(['Parametro', 'Valor']);
    hojaConfig.appendRow(['Telegram_Bot_Token', '']);
    hojaConfig.appendRow(['Telegram_Activo', 'FALSE']);
    hojaConfig.appendRow(['Email_Activo', 'TRUE']);
    hojaConfig.appendRow(['Hora_Ejecucion', '09:00']);
    hojaConfig.appendRow(['Zona_Horaria', 'America/Mexico_City']);
    hojaConfig.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#3b82f6').setFontColor('#ffffff');
    hojaConfig.setFrozenRows(1);
    ui.alert('Hoja "Configuracion" creada correctamente');
  } else {
    ui.alert('La hoja "Configuracion" ya existe');
  }
  
  // Hoja: Historial
  var hojaHistorial = ss.getSheetByName('Historial');
  if (!hojaHistorial) {
    hojaHistorial = ss.insertSheet('Historial');
    hojaHistorial.appendRow(['ID', 'Recordatorio_ID', 'Canal', 'Destinatario', 'Estado', 'Error', 'Fecha_Envio']);
    hojaHistorial.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#10b981').setFontColor('#ffffff');
    hojaHistorial.setFrozenRows(1);
    ui.alert('Hoja "Historial" creada correctamente');
  } else {
    ui.alert('La hoja "Historial" ya existe');
  }
  
  // Configurar trigger automatico
  crearTriggerDiario();
  
  ui.alert('Configuracion completada.\n\nLas hojas estan listas.\n\nAhora configura tu Token de Telegram en la hoja "Configuracion".');
}

// ============================================
// TRIGGERS AUTOMATICOS
// ============================================

function crearTriggerDiario() {
  // Eliminar triggers existentes
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'ejecutarEnvioDiario') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Crear nuevo trigger cada hora para verificar
  ScriptApp.newTrigger('ejecutarEnvioDiario')
    .timeBased()
    .everyHours(1)
    .create();
}

function ejecutarEnvioDiario() {
  var config = obtenerConfiguracion();
  var zonaHoraria = config.zonaHoraria || 'America/Mexico_City';
  var horaEjecucion = config.horaEjecucion || '09:00';
  
  var ahora = new Date();
  var horaActual = Utilities.formatDate(ahora, zonaHoraria, 'HH:mm');
  
  // Solo ejecutar en la hora configurada (con margen de 1 hora)
  var horaConfigurada = parseInt(horaEjecucion.split(':')[0]);
  var horaActualNum = parseInt(horaActual.split(':')[0]);
  
  if (horaActualNum !== horaConfigurada) {
    return;
  }
  
  // Obtener recordatorios pendientes de hoy
  var recordatorios = obtenerRecordatoriosPendientes();
  
  for (var i = 0; i < recordatorios.length; i++) {
    var r = recordatorios[i];
    enviarRecordatorio(r);
  }
}

// ============================================
// OBTENER DATOS
// ============================================

function obtenerConfiguracion() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('Configuracion');
  
  if (!hoja) {
    return {
      telegramToken: '',
      telegramActivo: false,
      emailActivo: true,
      horaEjecucion: '09:00',
      zonaHoraria: 'America/Mexico_City'
    };
  }
  
  var datos = hoja.getDataRange().getValues();
  var config = {};
  
  for (var i = 1; i < datos.length; i++) {
    var param = datos[i][0];
    var valor = datos[i][1];
    
    if (param === 'Telegram_Bot_Token') config.telegramToken = valor;
    if (param === 'Telegram_Activo') config.telegramActivo = (valor === true || valor === 'TRUE' || valor === 'true');
    if (param === 'Email_Activo') config.emailActivo = (valor === true || valor === 'TRUE' || valor === 'true');
    if (param === 'Hora_Ejecucion') config.horaEjecucion = valor;
    if (param === 'Zona_Horaria') config.zonaHoraria = valor;
  }
  
  return config;
}

function obtenerRecordatorios() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('Recordatorios');
  
  if (!hoja) return [];
  
  var datos = hoja.getDataRange().getValues();
  var recordatorios = [];
  
  for (var i = 1; i < datos.length; i++) {
    var fila = datos[i];
    if (fila[0]) { // Si tiene ID
      recordatorios.push({
        id: fila[0],
        nombre: fila[1],
        email: fila[2],
        telegramId: fila[3],
        fecha: fila[4],
        hora: fila[5],
        asunto: fila[6],
        mensaje: fila[7],
        estado: fila[8],
        enviadoEmail: fila[9],
        enviadoTelegram: fila[10],
        activo: fila[11],
        creado: fila[12],
        fila: i + 1
      });
    }
  }
  
  return recordatorios;
}

function obtenerRecordatoriosPendientes() {
  var todos = obtenerRecordatorios();
  var pendientes = [];
  var hoy = new Date();
  var fechaHoy = Utilities.formatDate(hoy, 'America/Mexico_City', 'yyyy-MM-dd');
  
  for (var i = 0; i < todos.length; i++) {
    var r = todos[i];
    var fechaRecordatorio = Utilities.formatDate(new Date(r.fecha), 'America/Mexico_City', 'yyyy-MM-dd');
    
    if (r.activo && fechaRecordatorio === fechaHoy && r.estado !== 'enviado') {
      pendientes.push(r);
    }
  }
  
  return pendientes;
}

// ============================================
// GUARDAR DATOS
// ============================================

function guardarConfiguracion(config) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('Configuracion');
  
  if (!hoja) return { success: false, error: 'Hoja Configuracion no existe' };
  
  var datos = hoja.getDataRange().getValues();
  
  for (var i = 1; i < datos.length; i++) {
    var param = datos[i][0];
    
    if (param === 'Telegram_Bot_Token') hoja.getRange(i + 1, 2).setValue(config.telegramToken);
    if (param === 'Telegram_Activo') hoja.getRange(i + 1, 2).setValue(config.telegramActivo ? 'TRUE' : 'FALSE');
    if (param === 'Email_Activo') hoja.getRange(i + 1, 2).setValue(config.emailActivo ? 'TRUE' : 'FALSE');
    if (param === 'Hora_Ejecucion') hoja.getRange(i + 1, 2).setValue(config.horaEjecucion);
    if (param === 'Zona_Horaria') hoja.getRange(i + 1, 2).setValue(config.zonaHoraria);
  }
  
  SpreadsheetApp.flush();
  return { success: true };
}

function guardarRecordatorio(recordatorio) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('Recordatorios');
  
  if (!hoja) return { success: false, error: 'Hoja Recordatorios no existe' };
  
  if (recordatorio.id) {
    // Actualizar existente
    var datos = hoja.getDataRange().getValues();
    for (var i = 1; i < datos.length; i++) {
      if (datos[i][0] === recordatorio.id) {
        hoja.getRange(i + 1, 2).setValue(recordatorio.nombre);
        hoja.getRange(i + 1, 3).setValue(recordatorio.email);
        hoja.getRange(i + 1, 4).setValue(recordatorio.telegramId);
        hoja.getRange(i + 1, 5).setValue(new Date(recordatorio.fecha));
        hoja.getRange(i + 1, 6).setValue(recordatorio.hora || '09:00');
        hoja.getRange(i + 1, 7).setValue(recordatorio.asunto);
        hoja.getRange(i + 1, 8).setValue(recordatorio.mensaje);
        hoja.getRange(i + 1, 12).setValue(recordatorio.activo ? 'TRUE' : 'FALSE');
        break;
      }
    }
  } else {
    // Crear nuevo
    var nuevoId = Utilities.getUuid();
    hoja.appendRow([
      nuevoId,
      recordatorio.nombre,
      recordatorio.email,
      recordatorio.telegramId,
      new Date(recordatorio.fecha),
      recordatorio.hora || '09:00',
      recordatorio.asunto,
      recordatorio.mensaje,
      'pendiente',
      '',
      '',
      'TRUE',
      new Date()
    ]);
  }
  
  SpreadsheetApp.flush();
  return { success: true };
}

function eliminarRecordatorio(id) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('Recordatorios');
  
  if (!hoja) return { success: false, error: 'Hoja no existe' };
  
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === id) {
      hoja.deleteRow(i + 1);
      break;
    }
  }
  
  SpreadsheetApp.flush();
  return { success: true };
}

// ============================================
// ENVIO DE NOTIFICACIONES
// ============================================

function enviarRecordatorio(recordatorio) {
  var config = obtenerConfiguracion();
  var resultados = { email: null, telegram: null };
  
  // Enviar Email
  if (config.emailActivo && recordatorio.email) {
    resultados.email = enviarEmail(recordatorio.email, recordatorio.asunto, recordatorio.mensaje);
    registrarEnvio(recordatorio.id, 'email', recordatorio.email, resultados.email.success, resultados.email.error);
  }
  
  // Enviar Telegram
  if (config.telegramActivo && recordatorio.telegramId && config.telegramToken) {
    resultados.telegram = enviarTelegram(config.telegramToken, recordatorio.telegramId, recordatorio.asunto, recordatorio.mensaje);
    registrarEnvio(recordatorio.id, 'telegram', recordatorio.telegramId, resultados.telegram.success, resultados.telegram.error);
  }
  
  // Actualizar estado
  actualizarEstadoRecordatorio(recordatorio.id, resultados);
  
  return resultados;
}

function enviarEmail(destinatario, asunto, mensaje) {
  try {
    GmailApp.sendEmail(destinatario, asunto, mensaje, {
      htmlBody: crearHtmlEmail(asunto, mensaje)
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function crearHtmlEmail(asunto, mensaje) {
  var html = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">';
  html = html + '<div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 20px; border-radius: 10px 10px 0 0;">';
  html = html + '<h2 style="color: white; margin: 0;">' + escapeHtml(asunto) + '</h2>';
  html = html + '</div>';
  html = html + '<div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">';
  html = html + '<p style="white-space: pre-wrap; line-height: 1.6; color: #374151;">' + escapeHtml(mensaje) + '</p>';
  html = html + '</div>';
  html = html + '<p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">Sistema de Recordatorios - Google Apps Script</p>';
  html = html + '</div>';
  return html;
}

function escapeHtml(texto) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function enviarTelegram(token, chatId, asunto, mensaje) {
  try {
    var texto = '*Recordatorio*\n\n*' + asunto + '*\n\n' + mensaje;
    var url = 'https://api.telegram.org/bot' + token + '/sendMessage';
    
    var payload = {
      chat_id: chatId,
      text: texto,
      parse_mode: 'Markdown'
    };
    
    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch(url, options);
    var result = JSON.parse(response.getContentText());
    
    if (result.ok) {
      return { success: true };
    } else {
      return { success: false, error: result.description };
    }
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function registrarEnvio(recordatorioId, canal, destinatario, success, error) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('Historial');
  
  if (!hoja) return;
  
  hoja.appendRow([
    Utilities.getUuid(),
    recordatorioId,
    canal,
    destinatario,
    success ? 'enviado' : 'error',
    error || '',
    new Date()
  ]);
  
  SpreadsheetApp.flush();
}

function actualizarEstadoRecordatorio(id, resultados) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('Recordatorios');
  
  if (!hoja) return;
  
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === id) {
      var emailOk = resultados.email && resultados.email.success;
      var telegramOk = resultados.telegram && resultados.telegram.success;
      
      hoja.getRange(i + 1, 9).setValue((emailOk || telegramOk) ? 'enviado' : 'error');
      hoja.getRange(i + 1, 10).setValue(emailOk ? 'SI' : '');
      hoja.getRange(i + 1, 11).setValue(telegramOk ? 'SI' : '');
      break;
    }
  }
  
  SpreadsheetApp.flush();
}

// ============================================
// PRUEBAS
// ============================================

function probarEmail() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt('Probar Email', 'Ingresa el email de prueba:', ui.ButtonSet.OK_CANCEL);
  
  if (response.getSelectedButton() === ui.Button.OK) {
    var email = response.getResponseText();
    var resultado = enviarEmail(email, 'Prueba - Sistema de Recordatorios', 'Si recibes este mensaje, el sistema de emails funciona correctamente.');
    
    if (resultado.success) {
      ui.alert('Email enviado correctamente a: ' + email);
    } else {
      ui.alert('Error al enviar: ' + resultado.error);
    }
  }
}

function probarTelegram() {
  var ui = SpreadsheetApp.getUi();
  var config = obtenerConfiguracion();
  
  if (!config.telegramToken) {
    ui.alert('Error: No hay Token de Telegram configurado.\n\nVe a la hoja "Configuracion" y agrega tu Telegram_Bot_Token.');
    return;
  }
  
  var response = ui.prompt('Probar Telegram', 'Ingresa el Chat ID de prueba:', ui.ButtonSet.OK_CANCEL);
  
  if (response.getSelectedButton() === ui.Button.OK) {
    var chatId = response.getResponseText();
    var resultado = enviarTelegram(config.telegramToken, chatId, 'Prueba de Telegram', 'Si ves este mensaje, Telegram funciona correctamente.');
    
    if (resultado.success) {
      ui.alert('Mensaje de Telegram enviado correctamente.');
    } else {
      ui.alert('Error al enviar: ' + resultado.error);
    }
  }
}

// ============================================
// API PARA FRONTEND
// ============================================

function obtenerDatosDashboard() {
  var recordatorios = obtenerRecordatorios();
  var config = obtenerConfiguracion();
  
  var hoy = new Date();
  var fechaHoy = Utilities.formatDate(hoy, 'America/Mexico_City', 'yyyy-MM-dd');
  
  var stats = {
    total: recordatorios.length,
    pendientes: 0,
    enviados: 0,
    hoy: 0
  };
  
  for (var i = 0; i < recordatorios.length; i++) {
    var r = recordatorios[i];
    if (r.estado === 'pendiente') stats.pendientes++;
    if (r.estado === 'enviado') stats.enviados++;
    
    var fechaRecordatorio = Utilities.formatDate(new Date(r.fecha), 'America/Mexico_City', 'yyyy-MM-dd');
    if (fechaRecordatorio === fechaHoy) stats.hoy++;
  }
  
  return {
    stats: stats,
    recordatorios: recordatorios,
    config: {
      telegramActivo: config.telegramActivo,
      emailActivo: config.emailActivo,
      telegramConfigurado: !!config.telegramToken
    }
  };
}

function obtenerHistorial() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('Historial');
  
  if (!hoja) return [];
  
  var datos = hoja.getDataRange().getValues();
  var historial = [];
  
  for (var i = datos.length - 1; i >= 1; i--) {
    var fila = datos[i];
    if (fila[0]) {
      historial.push({
        id: fila[0],
        recordatorioId: fila[1],
        canal: fila[2],
        destinatario: fila[3],
        estado: fila[4],
        error: fila[5],
        fecha: fila[6]
      });
    }
  }
  
  return historial.slice(0, 50); // Ultimos 50
}

// Enviar un recordatorio especifico desde el frontend
function enviarRecordatorioPorId(id) {
  var recordatorios = obtenerRecordatorios();
  for (var i = 0; i < recordatorios.length; i++) {
    if (recordatorios[i].id === id) {
      return enviarRecordatorio(recordatorios[i]);
    }
  }
  return { success: false, error: 'Recordatorio no encontrado' };
}
