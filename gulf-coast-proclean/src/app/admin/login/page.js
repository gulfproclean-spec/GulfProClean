import LoginForm from "@/components/LoginForm";

export const metadata = { title: "Admin Login | Gulf Coast ProClean" };

export default function AdminLoginPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-20">
      <LoginForm
        role="ADMIN"
        redirectTo="/admin"
        demoHint="Demo: admin@gulfcoastproclean.com / admin123"
      />
    </div>
  );
}
