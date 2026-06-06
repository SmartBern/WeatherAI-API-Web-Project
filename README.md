````markdown
# WeatherAI API Web Project


## Overview

A simple web application built with HTML, CSS, and JavaScript
that fetches real-time, hourly-based weather data from the WeatherAI API.

## Features

- Obtaining current weather conditions of a location
- Obtaining the 7-day forecast of a location

## Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- A [WeatherAI API key](https://weatherai.com)
- Node.js (v18+ recommended)
- npm


## Tech Stack

# Frontend
- HTML
- CSS
- JavaScript

# Backend
- Node.js
- Express.js


## Setup

```bash
# 1. Clone the repository
git clone https://github.com/SmartBern/WeatherAI-API-Web-Project.git
cd WeatherAI-API-Web-Project
```

```bash
# 2. Install dependencies
npm install
```

Open `.env`and add your API key
```bash
# 3. Add your API key (optional)
WAI_API_KEY = your_weatherai_api_key_here
```

> **Never commit your API key to version control.** Add `.env` to `.gitignore`.


```bash
# 4. Start the server
npm start
```
WeatherAI proxy running at: http://localhost:4001
Open http://localhost:4001 in your browser


## Project Structure

project-root/
├── index.html        # Main frontend page
├── style.css         # Styling
├── script.js         # Frontend JavaScript
├── server.js         # Backend (Node/Express)
├── package.json      # Dependencies and scripts
├── package-lock.json # Locked dependency versions
├── .env              # Environment variables (not committed, optional)
└── README.md


## Author
Oluwaseun Lawal

## License
MIT

