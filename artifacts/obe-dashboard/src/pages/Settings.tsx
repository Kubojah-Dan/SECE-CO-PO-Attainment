import { Layout } from "../components/layout/Layout";

export default function Settings() {
  return (
    <Layout>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Platform configuration and preferences.</p>
        <div className="mt-8 border rounded-lg p-8 text-center text-muted-foreground bg-muted/20">
          Settings configuration coming soon.
        </div>
      </div>
    </Layout>
  );
}
