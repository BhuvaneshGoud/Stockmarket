# StockMarket FullStack Application

A full-stack stock market trading application similar to AngelOne, UpStock, and Groww.

## Tech Stack
- **Frontend**: React.js with Vite
- **Backend**: Spring Boot (Java)
- **Database**: MySQL
- **Live Charts**: TradingView API

## Features
- User Registration & Login
- Stock Market Overview (20 stocks - 10 Indian + 10 US)
- Live Stock Charts (TradingView)
- Portfolio Management
- Buy/Sell Stocks
- Transaction History
- Virtual Wallet with ₹100,000 balance

## Prerequisites
- Java 17 or higher
- Maven
- Node.js and npm
- MySQL Server (running on localhost:3306)

## Database Configuration
- Host: localhost
- Port: 3306
- Username: babbi
- Password: babbi
- Database: stockmarketfullstack_db

## How to Run

### Backend
```
bash
cd backend
mvn spring-boot:run
```
The backend will start on http://localhost:8080

### Frontend
```
bash
cd frontend
npm install
npm run dev
```
The frontend will start on http://localhost:5173

## Default Stocks
The app includes 20 popular stocks:
- **Indian Stocks**: RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK, ADANIPORTS, SBIN, BHARTIARTL, HINDUNILVR, KOTAKBANK
- **US Stocks**: AAPL, GOOGL, MSFT, AMZN, TSLA, META, NVDA, JPM, V, WMT

## Project Structure
```
STOCKMARKET-FULLSTACK/
├── backend/                 # Spring Boot application
│   ├── src/main/java/
│   │   └── com/stockmarket/
│   │       ├── config/     # Configuration classes
│   │       ├── controller/ # REST controllers
│   │       ├── dto/        # Data Transfer Objects
│   │       ├── entity/     # JPA entities
│   │       ├── repository/ # Data repositories
│   │       ├── security/   # JWT security
│   │       └── service/    # Business logic
│   └── src/main/resources/
│       └── application.yml
├── frontend/               # React application
│   ├── src/
│   │   ├── api/           # API calls
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── App.jsx        # Main app component
│   │   └── index.css      # Global styles
│   └── index.html
└── SPEC.md                # Project specification
```

## API Endpoints

### Authentication
- POST /api/auth/register - Register new user
- POST /api/auth/login - User login

### Stocks
- GET /api/stocks - Get all stocks
- GET /api/stocks/{symbol} - Get stock by symbol
- GET /api/stocks/search?q={query} - Search stocks

### Portfolio
- GET /api/portfolio/{userId} - Get user portfolio
- GET /api/portfolio/{userId}/value - Get portfolio value
- GET /api/portfolio/{userId}/transactions - Get transactions
- POST /api/portfolio/buy - Buy stock
- POST /api/portfolio/sell - Sell stock

## Usage
1. Run the backend first (Spring Boot)
2. Run the frontend (React)
3. Open http://localhost:5173 in your browser
4. Register a new account
5. Start trading with your ₹100,000 virtual balance!
