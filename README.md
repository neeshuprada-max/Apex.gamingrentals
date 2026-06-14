# Apex Gaming Rentals 🎮

Premium PS4 rental service in **Kambil, Kannur, Kerala**.

## Features ✨

- ✅ Real-time availability checking
- ✅ Easy WhatsApp booking integration  
- ✅ Dynamic pricing with special Wed/Fri rates
- ✅ Admin dashboard for managing bookings
- ✅ Firebase Firestore backend
- ✅ Fully responsive design
- ✅ Beautiful UI with Tailwind CSS

## Getting Started 🚀

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/neeshuprada-max/Apex.gamingrentals.git
cd Apex.gamingrentals
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` folder.

## Deployment 🌐

### Option 1: Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click **"New Project"** → **"Import Git Repository"**
4. Select your GitHub repository
5. Vercel auto-detects React and deploys automatically
6. Your site will be live in ~2 minutes!

**Your live URL:** `https://apex-gaming-rentals.vercel.app`

### Option 2: Deploy to Netlify

1. Go to [netlify.com](https://netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your GitHub repository
4. Netlify auto-detects build settings
5. Click **"Deploy"**

### Option 3: Deploy to GitHub Pages

1. Update `package.json` homepage:
```json
{
  "homepage": "https://neeshuprada-max.github.io/Apex.gamingrentals"
}
```

2. Install gh-pages:
```bash
npm install --save-dev gh-pages
```

3. Add deploy scripts to `package.json`:
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d build"
  }
}
```

4. Deploy:
```bash
npm run deploy
```

## Firebase Setup 🔧

To use the booking system, configure Firebase:

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
2. Get your Firebase config
3. Update `src/App.js`:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  projectId: "YOUR_PROJECT_ID",
  // ... other config
};
```

## Admin Dashboard 🛡️

Access the admin panel at the bottom of the page. Enter PIN: **1234**

Features:
- View all booking requests
- Approve/Reject bookings
- See real-time statistics
- Manage booking status

## Project Structure 📁

```
Apex.gamingrentals/
├── public/
│   └── index.html
├── src/
│   ├── App.js
│   └── index.css
├── package.json
├── tailwind.config.js
├── vercel.json
├── netlify.toml
└── README.md
```

## Tech Stack 💻

- **React** - UI Framework
- **Tailwind CSS** - Styling
- **Firebase** - Backend/Database
- **Lucide React** - Icons
- **React Scripts** - Build tools

## Contact 📞

**Apex Gaming Rentals**
- 📍 Location: Kambil, Kannur, Kerala
- 💬 WhatsApp: +91 7736689545

## License 📄

All rights reserved © 2026 Apex Gaming Rentals

---

**Ready to deploy?** Choose your preferred hosting platform above and go live! 🎉
