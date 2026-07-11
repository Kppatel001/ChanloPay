import { Header } from '@/components/layout/header';
import { FraudDetectionForm } from '@/components/fraud-detection-form';

export default function FraudDetectionPage() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header pageTitle="Fraud Detection" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="mx-auto w-full max-w-2xl">
          <FraudDetectionForm />
        </div>
      </main>
    </div>
  );
}
