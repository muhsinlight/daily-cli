import axios from 'axios';

export const http = axios.create({
  timeout: 8000,
  headers: {
    'User-Agent': 'daily-cli'
  }
});

http.interceptors.response.use(null, async (error) => {
  const { config } = error;
  
  if (!config || config.retry === 0) return Promise.reject(error);
  
  config.retry = config.retry || 2;
  config.retryCount = config.retryCount || 0;
  
  if (config.retryCount >= config.retry) {
    return Promise.reject(error);
  }
  
  config.retryCount += 1;
  
  const backoff = new Promise((resolve) => {
    setTimeout(resolve, config.retryDelay || 1000);
  });
  
  await backoff;
  return http(config);
});
