'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { RegisterForm, LanguageSwitcher } from '@rentalshop/ui';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleRegister = async (data: any) => {
    // Registration is now handled directly by the RegisterForm component
    // using the centralized API. This function is kept for compatibility
    // but the actual registration logic is in the form component.
    console.log('Registration data received:', data);
  };

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4 relative overflow-hidden">
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(-10px) translateX(-10px); }
          75% { transform: translateY(-15px) translateX(5px); }
        }
        
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
          50% { transform: translateY(-30px) translateX(-20px) scale(1.1); }
        }
        
        @keyframes rotate-move {
          0% { transform: rotate(0deg) translate(-50%, -50%); }
          25% { transform: rotate(90deg) translate(-30%, -70%); }
          50% { transform: rotate(180deg) translate(-50%, -50%); }
          75% { transform: rotate(270deg) translate(-70%, -30%); }
          100% { transform: rotate(360deg) translate(-50%, -50%); }
        }
        
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.5; }
        }
        
        .float-1 { animation: float 8s ease-in-out infinite; }
        .float-2 { animation: float 10s ease-in-out infinite 1s; }
        .float-3 { animation: float 12s ease-in-out infinite 2s; }
        .float-4 { animation: float-slow 15s ease-in-out infinite 0.5s; }
        .pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
      `}</style>
      
      {/* Background Pattern - Grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle, #c7d2fe 1.5px, transparent 1.5px)`,
        backgroundSize: '50px 50px',
        opacity: 0.4
      }}></div>
      
      {/* Floating Elements - Giữ như cũ */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-blue-400 rounded-full opacity-30 blur-2xl pointer-events-none float-1 pulse-glow"></div>
      <div className="absolute top-40 right-20 w-24 h-24 bg-indigo-400 rounded-full opacity-40 blur-2xl pointer-events-none float-2 pulse-glow"></div>
      <div className="absolute bottom-32 left-20 w-20 h-20 bg-purple-400 rounded-full opacity-35 blur-2xl pointer-events-none float-3 pulse-glow"></div>
      <div className="absolute bottom-20 right-32 w-36 h-36 bg-blue-500 rounded-full opacity-30 blur-2xl pointer-events-none float-4 pulse-glow"></div>
      
      {/* Decorative Shapes - Di chuyển xa hơn */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-200 to-transparent rounded-full opacity-40 blur-3xl pointer-events-none" style={{
        animation: 'rotate-move 30s ease-in-out infinite',
        transformOrigin: 'center'
      }}></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-indigo-200 to-transparent rounded-full opacity-35 blur-3xl pointer-events-none" style={{
        animation: 'rotate-move 25s ease-in-out infinite reverse',
        transformOrigin: 'center'
      }}></div>
      
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher variant="compact" />
      </div>

      <div className="relative z-10 w-full">
        <RegisterForm 
          initialStep={(searchParams.get('step') === '2' ? 2 : 1) as 1 | 2}
          onNavigate={(path) => {
            // Allow external navigations to pass through
            if (path === '/login' || path === '/terms' || path === '/privacy' || path.startsWith('/email-verification')) {
              router.push(path);
              return;
            }
            // Map internal navigation to query param pattern
            if (path.includes('step-2')) router.push('/register?step=2');
            else router.push('/register?step=1');
          }}
          onRegister={handleRegister}
        />
      </div>
    </div>
  );
} 