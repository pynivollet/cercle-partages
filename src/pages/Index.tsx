import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/home/Hero";
import EventCalendar from "@/components/home/EventCalendar";
import Philosophy from "@/components/home/Philosophy";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <EventCalendar />
        <Philosophy />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
