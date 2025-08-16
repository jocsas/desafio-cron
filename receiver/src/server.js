const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs').promises;
const path = require('path');

require('dotenv-flow').config();

const app = express();
const PORT = process.env.RECEIVER_API_PORT || 3002;
const LOGS_DIR = process.env.LOGS_DIR;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ limit: '10mb' }));

// Garantir que o diretório de logs existe
async function ensureLogsDirectory() {
  try {
    await fs.access(LOGS_DIR);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(LOGS_DIR, { recursive: true });
      console.log(`Created logs directory: ${LOGS_DIR}`);
    } else {
      throw error;
    }
  }
}

// Função para formatar a mensagem com timestamp
function formatMessage(body, timestamp = new Date()) {
  const dateStr = timestamp.toISOString().replace('T', ' ').substring(0, 19);
  
  let bodyStr;
  if (typeof body === 'object') {
    bodyStr = JSON.stringify(body, null, 2);
  } else {
    bodyStr = String(body);
  }
  
  return `${dateStr} - ${bodyStr}`;
}

// Função para escrever no arquivo de log
async function writeToLogFile(message, filename = 'cron-notifications.log') {
  try {
    const logPath = path.join(LOGS_DIR, filename);
    const formattedMessage = message + '\n';
    
    await fs.appendFile(logPath, formattedMessage, 'utf8');
    console.log(`Message written to log file: ${logPath}`);
  } catch (error) {
    console.error('Error writing to log file:', error);
  }
}

// Função para obter informações da requisição
function getRequestInfo(req) {
  return {
    method: req.method,
    url: req.url,
    headers: req.headers,
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress
  };
}

// Endpoint principal para receber notificações dos CRONs
app.all('/webhook', async (req, res) => {
  try {
    const timestamp = new Date();
    const requestInfo = getRequestInfo(req);
    
    // Formata a mensagem principal
    const message = formatMessage(req.body, timestamp);
    
    // Exibe no console
    console.log('='.repeat(50));
    console.log('CRON NOTIFICATION RECEIVED');
    console.log('='.repeat(50));
    console.log(`Method: ${requestInfo.method}`);
    console.log(`Timestamp: ${requestInfo.timestamp}`);
    console.log(`User-Agent: ${requestInfo.userAgent}`);
    console.log('Message:', message);
    console.log('='.repeat(50));
    
    // Escreve no arquivo de log
    const logMessage = `[${requestInfo.method}] ${message} | User-Agent: ${requestInfo.userAgent}`;
    await writeToLogFile(logMessage);
    
    // Responde com sucesso
    res.status(200).json({
      success: true,
      message: 'Notification received successfully',
      timestamp: requestInfo.timestamp,
      receivedData: req.body
    });
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    const errorMessage = `ERROR: ${error.message}`;
    await writeToLogFile(errorMessage, 'cron-errors.log');
    
    res.status(500).json({
      success: false,
      error: 'Failed to process notification',
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para listar logs
app.get('/logs', async (req, res) => {
  try {
    const files = await fs.readdir(LOGS_DIR);
    const logFiles = files.filter(file => file.endsWith('.log'));
    
    const logs = {};
    
    for (const file of logFiles) {
      try {
        const content = await fs.readFile(path.join(LOGS_DIR, file), 'utf8');
        const lines = content.split('\n').filter(line => line.trim() !== '');
        logs[file] = {
          lineCount: lines.length,
          lastLines: lines.slice(-10), // Últimas 10 linhas
          size: content.length
        };
      } catch (error) {
        logs[file] = { error: error.message };
      }
    }
    
    res.json({
      totalFiles: logFiles.length,
      files: logFiles,
      logs: logs
    });
    
  } catch (error) {
    console.error('Error reading logs:', error);
    res.status(500).json({ error: 'Failed to read logs' });
  }
});

// Endpoint para ler um log específico
app.get('/logs/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { lines = 50 } = req.query;
    
    // Validar nome do arquivo (segurança)
    if (!filename.endsWith('.log') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const logPath = path.join(LOGS_DIR, filename);
    const content = await fs.readFile(logPath, 'utf8');
    
    const allLines = content.split('\n').filter(line => line.trim() !== '');
    const requestedLines = parseInt(lines);
    const logLines = allLines.slice(-requestedLines);
    
    res.json({
      filename: filename,
      totalLines: allLines.length,
      returnedLines: logLines.length,
      lines: logLines
    });
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Log file not found' });
    } else {
      console.error('Error reading log file:', error);
      res.status(500).json({ error: 'Failed to read log file' });
    }
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'CRON Receiver',
    logsDir: LOGS_DIR
  });
});

// Inicializar servidor
async function startServer() {
  try {
    await ensureLogsDirectory();
    
    app.listen(PORT, () => {
      console.log(`CRON Receiver service running on port ${PORT}`);
      console.log(`Logs directory: ${LOGS_DIR}`);
      console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
    });
  } catch (error) {
    console.error('Failed to start receiver server:', error);
    process.exit(1);
  }
}

startServer();