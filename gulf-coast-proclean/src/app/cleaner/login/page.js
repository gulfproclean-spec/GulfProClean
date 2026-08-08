import LoginForm from "@/components/LoginForm";

export const metadata = { title: "Cleaner Login | Gulf Coast ProClean" };

export default function CleanerLoginPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-20">
      <LoginForm
        role="CLEANER"
        redirectTo="/cleaner"
        demoHint="Demo: maria@gulfcoastproclean.com / cleaner123"
      />
    </div>
  );
}
