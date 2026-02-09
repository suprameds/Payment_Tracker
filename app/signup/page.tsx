import { AuthForm } from '@/components/auth/auth-form';

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">Join Pharma Dispatch</h1>
          <p className="text-blue-700">Create your account to get started</p>
        </div>
        <AuthForm view="signup" />
      </div>
    </div>
  );
}
