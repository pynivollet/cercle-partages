import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { getProfileById } from "@/services/profiles";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { getProfileDisplayName, getProfileInitials } from "@/lib/profileName";
import { useLanguage } from "@/i18n/LanguageContext";
import { formatLongDate } from "@/lib/dateUtils";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface Presentation {
  id: string;
  title: string;
  presentation_date: string;
}

const PresenterProfile = () => {
  const { t, language } = useLanguage();
  const { id } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      // Fetch profile
      const { data: profileData, error: profileError } = await getProfileById(id);
      if (profileData && !profileError) {
        setProfile(profileData);
      }

      // Fetch presentations by this presenter
      const { data: presentationsData } = await supabase
        .from("presentations")
        .select("id, title, presentation_date")
        .eq("presenter_id", id)
        .order("presentation_date", { ascending: false });

      if (presentationsData) {
        setPresentations(presentationsData);
      }

      setLoading(false);
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 md:pt-32">
          <div className="editorial-container mb-8">
            <Skeleton className="h-4 w-20" />
          </div>
          <section className="editorial-container section-padding pt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
              <div className="lg:col-span-1">
                <Skeleton className="aspect-[3/4] w-full" />
              </div>
              <div className="lg:col-span-2">
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-12 w-64 mb-2" />
                <Skeleton className="h-6 w-48 mb-12" />
                <Skeleton className="h-32 w-full mb-12" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 md:pt-32">
          <div className="editorial-container section-padding text-center">
            <h1 className="text-2xl text-foreground mb-4">{t.common.error}</h1>
            <Link to="/" className="text-primary hover:underline">
              {t.nav.home}
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 md:pt-32">
        {/* Breadcrumb */}
        <div className="editorial-container mb-8">
          <Link
            to="/intervenants"
            className="font-sans text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← {t.presenter.back}
          </Link>
        </div>

        <section className="editorial-container section-padding pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            {/* Image */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-1"
            >
              <div className="aspect-square max-w-[280px] overflow-hidden sticky top-32 bg-muted">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={getProfileDisplayName(profile)}
                    className="w-full h-full object-cover grayscale"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <span className="text-6xl font-serif">
                      {getProfileInitials(profile)}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-2"
            >
              <p className="font-sans text-sm tracking-widest uppercase text-muted-foreground mb-4">
                {t.presenter.title}
              </p>
              <h1 className="text-headline text-foreground mb-12">
                {getProfileDisplayName(profile)}
              </h1>

              {/* Bio */}
              {profile.bio && (
                <div className="prose prose-lg max-w-none mb-12">
                  <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
                    {profile.bio}
                  </p>
                </div>
              )}

              {/* Past Presentations */}
              {presentations.length > 0 && (
                <div className="pt-12 border-t border-border">
                  <h3 className="font-serif text-xl mb-6">
                    {t.presenter.presentations}
                  </h3>
                  <div className="space-y-4">
                    {presentations.map((presentation) => (
                      <Link
                        key={presentation.id}
                        to={`/rencontre/${presentation.id}`}
                        className="block group py-4 border-b border-border hover:bg-muted/30 transition-colors -mx-4 px-4"
                      >
                        <p className="font-sans text-sm text-muted-foreground mb-1 capitalize">
                          {formatLongDate(presentation.presentation_date, language)}
                        </p>
                        <p className="font-serif text-lg text-foreground group-hover:text-primary transition-colors">
                          {presentation.title}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default PresenterProfile;
