# Stock Market Application Specification

## Project Overview
- **Project Name**: StockMarket FullStack
- **Type**: Full-stack Stock Market Web Application
- **Core Functionality**: Real-time stock trading simulation with live charts, portfolio management, and transaction tracking
- **Target Users**: Stock market enthusiasts and investors

## Technology Stack
- **Frontend**: React.js with modern UI components
- **Backend**: Spring Boot (Java)
- **Database**: MySQL
- **Live Charts API**: TradingView (using provided API key)

## Database Configuration
- **Host**: localhost
- **Port**: 3306
- **Username**: babbi
- **Password**: babbi
- **Database Name**: stockmarketfullstack_db

## UI/UX Specification

### Layout Structure
- **Header**: Logo, navigation, user profile, wallet balance
- **Sidebar**: Quick links to Dashboard, Markets, Portfolio, Transactions, Watchlist
- **Main Content**: Dynamic content area based on navigation
- **Footer**: Copyright and links

### Visual Design
- **Color Palette**:
  - Primary: #1E3A5F (Deep Navy Blue)
  - Secondary: #2E5A88 (Ocean Blue)
  - Accent: #00D09C (Green - Profit)
  - Loss: #FF4757 (Red - Loss)
  - Background: #0D1421 (Dark)
  - Card Background: #1A2332
  - Text Primary: #FFFFFF
  - Text Secondary: #8899A6

- **Typography**:
  - Font Family: 'DM Sans', 'Poppins', sans-serif
  - Headings: Bold, 24-32px
  - Body: Regular, 14-16px

- **Spacing**: 8px base unit (8, 16, 24, 32px)

### Pages & Components

#### 1. Dashboard Page
- Portfolio summary card with total value
- Gain/Loss indicator
- Recent transactions
- Top movers (gainers/losers)
- Market indices overview

#### 2. Markets Page
- Stock search bar
- Stock list with live prices
- Price change indicators (green/red)
- Filter by sector
- Sort by price, change, volume

#### 3. Stock Detail Page
- Stock information header
- Interactive live chart (TradingView)
- Buy/Sell buttons
- Order book simulation
- Key statistics

#### 4. Portfolio Page
- Holdings list with current value
- Profit/Loss per stock
- Pie chart for allocation
- Individual stock performance

#### 5. Transactions Page
- Transaction history table
- Buy/Sell indicators
- Date filtering
- Transaction details

### Backend API Endpoints

#### User Management
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `GET /api/users/{id}` - Get user details
- `PUT /api/users/{id}` - Update user

#### Stocks
- `GET /api/stocks` - Get all stocks
- `GET /api/stocks/{symbol}` - Get stock by symbol
- `GET /api/stocks/search?q={query}` - Search stocks

#### Portfolio
- `GET /api/portfolio/{userId}` - Get user portfolio
- `POST /api/portfolio/buy` - Buy stock
- `POST /api/portfolio/sell` - Sell stock

#### Transactions
- `GET /api/transactions/{userId}` - Get user transactions
- `GET /api/transactions/{userId}/history` - Transaction history

## Database Schema

### Users Table
- id (BIGINT, PRIMARY KEY)
- username (VARCHAR)
- email (VARCHAR)
- password (VARCHAR)
- balance (DECIMAL)
- created_at (TIMESTAMP)

### Stocks Table
- id (BIGINT, PRIMARY KEY)
- symbol (VARCHAR, UNIQUE)
- name (VARCHAR)
- sector (VARCHAR)
- current_price (DECIMAL)
- price_change (DECIMAL)
- volume (BIGINT)

### Holdings Table
- id (BIGINT, PRIMARY KEY)
- user_id (BIGINT, FOREIGN KEY)
- stock_id (BIGINT, FOREIGN KEY)
- quantity (INT)
- average_price (DECIMAL)
- created_at (TIMESTAMP)

### Transactions Table
- id (BIGINT, PRIMARY KEY)
- user_id (BIGINT, FOREIGN KEY)
- stock_id (BIGINT, FOREIGN KEY)
- type (ENUM: BUY, SELL)
- quantity (INT)
- price (DECIMAL)
- total_amount (DECIMAL)
- created_at (TIMESTAMP)

## Functionality Specification

### Core Features
1. User registration and authentication
2. Virtual wallet with balance
3. Real-time stock prices (simulated with API data)
4. Buy/Sell stocks
5. Portfolio tracking
6. Transaction history
7. Watchlist
8. Live interactive charts
9. Market statistics

### User Flows
1. Registration → Login → Dashboard
2. Browse Markets → Select Stock → View Details → Buy → Confirm
3. View Portfolio → Select Holding → Sell → Confirm

## Acceptance Criteria
- [ ] Application builds without errors
- [ ] Frontend connects to backend API
- [ ] Database tables created successfully
- [ ] User can register and login
- [ ] Dashboard displays portfolio summary
- [ ] Market page shows list of stocks
- [ ] Stock detail page shows live chart
- [ ] Buy/Sell functionality works
- [ ] Transaction history is recorded
- [ ] UI matches dark theme design
