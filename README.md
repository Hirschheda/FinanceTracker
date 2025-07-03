# Finance Tracker

Link: https://main.d3rigao14mb5zh.amplifyapp.com/ 

**Finance Tracker** is a full-stack web application that lets users record, visualize, and manage their personal finances. Users can log income and expenses, view summaries, filter by category, and see interactive charts. An additional **Investments** section allows users to track stock holdings, view profit & loss, and see portfolio performance.

---

## 🚀 Tech Stack

- **Front‑end:** React, Ant Design, Recharts, React Router, OIDC (react-oidc-context)
- **Back‑end:** AWS Lambda (Node.js), Amazon API Gateway, AWS DynamoDB
- **Authentication:** Amazon Cognito (OAuth2/OpenID Connect)
- **Hosting:** AWS S3 + CloudFront or AWS Amplify Console
- **Styling & Theming:** Ant Design, custom light/dark mode stored in `localStorage`

---

## 📦 Features

### Dashboard
<img width="1409" alt="Screenshot 2025-07-01 at 3 15 42 PM" src="https://github.com/user-attachments/assets/3a3a5697-fae2-4e38-a55c-94a064128c77" />

- Add, edit, and delete transactions (income/expense).
- Paginated table of recent transactions, sortable by date.
- Expense breakdown pie chart with clickable slices for filtering.
- Summary cards showing total income, total expenses, and net balance.
- Light / dark theme toggle persisted across sessions.

### Investments
<img width="1409" alt="Screenshot 2025-07-03 at 10 14 37 AM" src="https://github.com/user-attachments/assets/940fb3cb-1204-4e51-b995-144d1f27b322" />

- Search for stock tickers (leveraging Finnhub API).
- Add, edit, delete or "sell" stock positions.
- Table of holdings with symbol, shares, cost basis, purchase date, current price, P/L.
- Interactive portfolio value chart with time-range selectors (1W, 1M, YTD, 1Y).
- Profit & loss and current portfolio valuation summaries.

### Authentication & Settings

- Sign up / sign in via Cognito (email + password, Google OAuth optional).
- Secure routes with OIDC session; redirects to login if not authenticated.
- Settings modal to toggle theme and manage password.
- Welcome message greeting the user by name.

---

## 🛠️ Getting Started

### Prerequisites

- Node.js v16+
- AWS CLI configured with a deployment user
- AWS account with permissions for Lambda, API Gateway, DynamoDB, Cognito, S3, CloudFront (or Amplify)

### Local Setup

1. **Clone the repo**:

   ```bash
   git clone https://github.com/<your‑org>/finance-tracker.git
   cd finance-tracker
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure environment**:

   - Copy `.env.example` to `.env` and fill in:
     ```ini
     REACT_APP_API_BASE_URL=https://<api‑id>.execute-api.<region>.amazonaws.com/
     REACT_APP_FHUB_API_KEY=<your‑finnhub‑key>
     REACT_APP_COGNITO_DOMAIN=<your‑cognito‑domain>
     REACT_APP_COGNITO_CLIENT_ID=<app‑client‑id>
     REACT_APP_COGNITO_REDIRECT_URI=http://localhost:3000/
     ```

4. **Start development server**:

   ```bash
   npm run start
   ```

   App will be available at `http://localhost:3000/`.

### Running Backend Locally

You can invoke Lambdas via `serverless-offline` or test directly in the AWS Console:

```bash
cd api
npm install
npm run deploy:dev   # if using Serverless Framework
offline
```

### Deployment

This project can be deployed via AWS Amplify Console by connecting your Git repo and enabling auto‑build. Alternatively, you can deploy manually:

1. **API & Lambda**: Use Serverless Framework or AWS SAM to package & deploy.
2. **DynamoDB**: Create a table `Transactions` with primary key `email` (String) and sort key `id` (String).
3. **Cognito**: Create a user pool & app client; configure callback URL, OAuth flows, and identity providers.
4. **Static Website**:
   - Build React: `npm run build`
   - Share repository with AWS Amplify to host static website

---

## 📝 Folder Structure

```
finance-tracker/
├── api/                # Lambda functions & infrastructure definitions
├── public/             # Static assets
├── src/
│   ├── pages/          # Dashboard.jsx, Investments.jsx
│   ├── components/     # Shared UI components
│   ├── styles/         # Global CSS & theming
│   ├── App.jsx
│   └── index.js
├── package.json
└── README.md
```

---

## 🔐 Security & IAM

- Lambdas need an inline or managed IAM policy granting `dynamodb:PutItem`, `Query`, `Scan`, `UpdateItem`, `DeleteItem` on your DynamoDB table.
- Cognito App Client must list your production callback URL(s) and use `Authorization code` grant with `openid`, `email`, `phone` scopes.

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request


*Happy budgeting!* 🎉

