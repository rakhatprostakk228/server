const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Настройка CORS для разрешения запросов с вашего React приложения
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5000', 'https://tabysty-urpaq.web.app'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

const PORT = process.env.PORT || 5000;

// Middleware для логирования запросов
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Проверка маршрут для убеждения, что сервер работает
app.get('/api/health', (req, res) => {
  res.status(200).send({ 
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date()
  });
});

// Основной маршрут для обработки запросов к AI
app.post('/api/chat', async (req, res) => {
  console.log('Received chat request');
  
  try {
    const { messages, model, temperature, max_tokens } = req.body;

    // Базовая валидация
    if (!messages || !Array.isArray(messages)) {
      console.error('Invalid message format');
      return res.status(400).send({ 
        error: 'Неверный формат сообщений',
        details: 'Сообщения должны быть массивом'
      });
    }

    // Проверка API ключа
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('API key is missing');
      return res.status(500).send({ 
        error: 'Ошибка конфигурации сервера',
        details: 'API ключ не настроен'
      });
    }

    console.log(`Sending request to OpenAI API with ${messages.length} messages`);
    
    // Отправка запроса к OpenAI API
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: model || 'gpt-3.5-turbo',
        messages,
        temperature: temperature || 0.7,
        max_tokens: max_tokens || 1500
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Received response from OpenAI API');
    
    // Возвращаем данные клиенту
    return res.status(200).send(response.data);
  } catch (error) {
    console.error('Error processing request:');
    
    // Детализированная обработка ошибок
    let statusCode = 500;
    let errorMessage = 'Внутренняя ошибка сервера';
    let errorDetails = { message: error.message };
    
    if (error.response) {
      // Ошибка от OpenAI API
      statusCode = error.response.status;
      console.error(`API response error (${statusCode}):`, error.response.data);
      
      errorMessage = error.response.data.error?.message || 'Ошибка API';
      errorDetails = {
        status: error.response.status,
        data: error.response.data
      };
    } else if (error.request) {
      // Запрос отправлен, но нет ответа
      console.error('No response received from API');
      statusCode = 503;
      errorMessage = 'Сервис недоступен';
      errorDetails = {
        message: 'Не получен ответ от API'
      };
    }
    
    return res.status(statusCode).send({ 
      error: errorMessage,
      details: errorDetails
    });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║                                      ║
║   Server running on port ${PORT}        ║
║                                      ║
║   Health check: http://localhost:${PORT}/api/health ║
║   Chat API: http://localhost:${PORT}/api/chat     ║
║                                      ║
╚══════════════════════════════════════╝
  `);
});