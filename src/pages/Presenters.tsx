import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getPresenters } from "@/services/profiles";
import { Skeleton } from "@/components/ui/skeleton";
import { Database } from "@/integrations/supabase/types";
import { getProfileDisplayName, getProfileInitials } from "@/lib/profileName";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const Presenters = () => {
  const [presenters, setPresenters] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPresenters = async () => {
      const { data } = await getPresenters();
      if (data) {
        setPresenters(data);
      }
      setLoading(false);
    };
    fetchPresenters();
  }, []);

  const getInitials = (profile: Profile) => getProfileInitials(profile);


  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="editorial-container">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
              Intervenants
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Découvrez les personnalités qui animent nos rencontres et partagent leurs expertises.
            </p>
          </motion.div>

          {/* Presenters Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          ) : presenters.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">
              Aucun intervenant pour le moment.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {presenters.map((presenter, index) => (
                <motion.div
                  key={presenter.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Link
                    to={`/presentateur/${presenter.id}`}
                    className="block group"
                  >
                    <div className="p-6 border border-border/50 rounded-lg hover:border-primary/30 hover:bg-muted/30 transition-all duration-300">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {presenter.avatar_url ? (
                            <img
                              src={presenter.avatar_url}
                              alt={getProfileDisplayName(presenter)}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl font-serif text-muted-foreground">
                              {getInitials(presenter)}
                            </span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-serif text-xl text-foreground group-hover:text-primary transition-colors">
                            {getProfileDisplayName(presenter)}
                          </h3>
                        </div>
                      </div>

                      {presenter.bio && (
                        <p className="text-sm text-muted-foreground mt-4 line-clamp-3">
                          {presenter.bio}
                        </p>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Presenters;
