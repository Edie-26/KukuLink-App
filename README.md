KukuLink - Chick Ordering App
KukuLink is a mobile application designed for ordering chicks in Uganda, connecting buyers with local suppliers or hatcheries. Buyers can browse chick types, place orders, track deliveries, manage payments, and more. Suppliers can manage their stock, view orders, and handle customer interactions. An admin role is planned for oversight.
The app is built as a full-stack project with a React Native mobile frontend and a Node.js backend.

Project Overview
Purpose: Make poultry ordering easy, fast, and reliable in Kampala and beyond.
Current Status: Frontend UI complete (Welcome, Sign In/Sign Up with role selection, Buyer dashboard with cards, Profile, single-page ordering flow). Backend with PostgreSQL (Prisma) set up, basic API routes for products(chicks.)
Developer: Edith Musasizi– January 2026

Tech Stack

Frontend (Mobile App - frontend/ folder)
React Native – Cross-platform mobile framework (Android/iOS)
Expo – Development toolkit (hot reload, Expo Go testing, no native code needed)
Expo Router – File-based routing and navigation (tabs, stack, route groups for auth/protected screens)
TypeScript – All files are .tsx for type safety
@expo/vector-icons – Icons
StyleSheet – Native styling 

Backend (API - backend/ folder)
Node.js – Runtime
Express.js – Web server and API routing
Prisma – ORM for PostgreSQL (migrations, type-safe queries)
PostgreSQL – Database 
nodemon – Auto-restart during development

Other Tools
npm – Package management
VS Code – Editor
Expo Go – Testing on phone
Browser – API testing

Current Features
Welcome screen with Sign In/Sign Up
Sign Up with role selection (Buyer/Supplier) using radio buttons
Buyer dashboard with green header, search bar, 7 cards (Order Chicks, Track Order, My Orders, Specialists, Chick Care Tips, FAQ, Wallet)
Single-page ordering (categories → details → quantity → add to cart)
Bottom tabs (Home, Profile, Notifications)
Fake role-based redirect
Supplier dashboard with custom cards

Planned Features
Real authentication (JWT + bcrypt)
Admin dashboard
Cart 
Order tracking timeline
Payments (MTN MoMo)
Notifications
Backend API integration (real sign-up, products from DB)
