FROM node:18-alpine

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .

CMD ["node", "bot.js"]
```

---

## **📁 Structure finale de ton projet**

Tu dois avoir ces fichiers :
```
├── bot.js
├── package.json
└── Dockerfile