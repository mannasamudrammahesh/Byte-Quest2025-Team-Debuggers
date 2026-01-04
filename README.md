# GrievAI - Government Grievance Redressal System

## About GrievAI

GrievAI is an AI-powered government grievance redressal system designed to streamline citizen service delivery and improve government responsiveness. Built for the Byte Quest 2025 hackathon by Team Debuggers.

## Features

- **AI-Powered Analysis**: Automatic categorization and prioritization of grievances
- **Multi-Modal Input**: Text, voice, image, and location-based grievance submission
- **Real-Time Tracking**: Citizens can track their grievance status in real-time
- **Role-Based Access**: Separate dashboards for citizens, officers, and administrators
- **Location Services**: Accurate location capture and mapping using LocationIQ
- **Multi-Language Support**: Internationalization support for multiple languages
- **Responsive Design**: Works seamlessly across desktop and mobile devices

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI Integration**: Lovable AI Gateway for grievance analysis
- **Location Services**: LocationIQ API with OpenStreetMap fallback
- **Build Tool**: Vite
- **Authentication**: Supabase Auth with role-based access control

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- LocationIQ API key (optional, has fallback)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Byte-Quest2025-Team-Debuggers
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_LOCATIONIQ_API_KEY=your_locationiq_key
```

4. Set up Supabase:
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push database migrations
supabase db push

# Deploy edge functions
supabase functions deploy analyze-grievance
```

5. Start the development server:
```bash
npm run dev
```

## User Roles

### Citizens
- Submit grievances through multiple input methods
- Track grievance status and updates
- View resolution history
- Receive notifications on status changes

### Government Officers
- View assigned grievances by department
- Update grievance status and add comments
- Access detailed analytics and reports
- Manage workload and priorities

### Administrators
- Oversee entire system operations
- Manage user roles and permissions
- Access comprehensive analytics
- Configure system settings

## API Configuration

### Supabase Edge Functions
Configure the following environment variables in your Supabase project:

```env
LOVABLE_API_KEY=your_lovable_api_key
OPENCAGE_API_KEY=your_opencage_key (optional)
```

### LocationIQ Integration
Get your API key from [LocationIQ](https://locationiq.com/) and add it to your `.env` file.

## Deployment

The application can be deployed to any static hosting service:

### Vercel
```bash
npm run build
# Deploy to Vercel
```

### Netlify
```bash
npm run build
# Deploy dist/ folder to Netlify
```

### Supabase Hosting
```bash
supabase hosting deploy
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Team Debuggers

This project was developed by Team Debuggers for Byte Quest 2025.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the GitHub repository.
