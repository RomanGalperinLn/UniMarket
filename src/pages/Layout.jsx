
import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Gavel, Plus, User, Home, LayoutDashboard, LogOut, Coins } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import InitializeUserData from '../components/onboarding/InitializeUserData';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Elegant theme colors
  const bgColor = '#FAFAF9';
  const surfaceColor = '#FFFFFF';
  const primaryColor = '#2D3648';
  const secondaryColor = '#B08968';
  const textColor = '#1A1A1A';
  const textMuted = 'rgba(26, 26, 26, 0.6)';
  const borderColor = 'rgba(0, 0, 0, 0.1)';

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await base44.auth.logout();
    navigate(createPageUrl("Home"));
  };

  const navigationItems = [
    {
      title: "Marketplace",
      url: createPageUrl("Home"),
      icon: Home,
    },
    {
      title: "Sell Item",
      url: createPageUrl("ListingNew"),
      icon: Plus,
      requireAuth: true,
    },
    {
      title: "My Profile",
      url: createPageUrl("Profile"),
      icon: User,
      requireAuth: true,
    },
    {
      title: "Sell Dashboard",
      url: createPageUrl("SellDashboard"),
      icon: LayoutDashboard,
      requireAuth: true,
    },
    {
      title: "Admin Dashboard",
      url: createPageUrl("Admin"),
      icon: LayoutDashboard,
      requireAuth: true,
    },
  ];

  const visibleItems = navigationItems.filter(
    item => !item.requireAuth || user
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bgColor }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: primaryColor }} />
      </div>
    );
  }

  return (
    <SidebarProvider>
      {user && <InitializeUserData user={user} />}
      
      <div className="min-h-screen flex w-full" style={{ background: bgColor }}>
        <Sidebar style={{ 
          borderRight: `1px solid ${borderColor}`,
          background: surfaceColor,
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.05)'
        }}>
          <SidebarHeader style={{ borderBottom: `1px solid ${borderColor}`, padding: '1.5rem' }}>
            <Link to={createPageUrl("Home")} className="flex items-center gap-3 group">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: secondaryColor,
                  boxShadow: '0 2px 8px rgba(176, 137, 104, 0.2)'
                }}
              >
                <Gavel className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-lg tracking-wide" style={{ color: textColor }}>
                  UniMarket
                </h2>
                <p className="text-xs" style={{ color: secondaryColor }}>
                  Classic Edition
                </p>
              </div>
            </Link>
          </SidebarHeader>
          
          <SidebarContent style={{ padding: '0.75rem', background: surfaceColor }}>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          style={{
                            background: isActive ? 'rgba(176, 137, 104, 0.1)' : 'transparent',
                            color: isActive ? primaryColor : textMuted,
                            borderLeft: isActive ? `2px solid ${secondaryColor}` : 'none',
                            borderRadius: '8px',
                            marginBottom: '0.25rem',
                            transition: 'all 0.2s'
                          }}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                            <item.icon className="w-5 h-5" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {user && (
              <SidebarGroup className="mt-4">
                <div className="px-3 py-2">
                  <div 
                    className="rounded-xl p-3"
                    style={{
                      background: 'rgba(176, 137, 104, 0.08)',
                      border: `1px solid ${borderColor}`,
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    <div className="flex items-center justify-between text-sm mb-2">
                      <div className="flex items-center gap-2" style={{ color: textMuted }}>
                        <Coins className="w-4 h-4" style={{ color: secondaryColor }} />
                        <span>Credits</span>
                      </div>
                    </div>
                    <div 
                      className="text-2xl font-semibold"
                      style={{ color: secondaryColor }}
                    >
                      £{(user.credits_balance || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter style={{ 
            borderTop: `1px solid ${borderColor}`, 
            padding: '1rem',
            background: surfaceColor
          }}>
            {user ? (
              <div className="space-y-3">
                <div 
                  className="flex items-center gap-3 p-2 rounded-xl"
                  style={{
                    background: 'rgba(0, 0, 0, 0.02)'
                  }}
                >
                  <Avatar 
                    className="w-9 h-9"
                    style={{ 
                      border: `2px solid ${borderColor}`
                    }}
                  >
                    <AvatarImage src={user.photo} />
                    <AvatarFallback 
                      className="font-semibold"
                      style={{
                        background: secondaryColor,
                        color: '#FFFFFF'
                      }}
                    >
                      {user.name?.charAt(0) || user.email?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: textColor }}>
                      {user.name || 'User'}
                    </p>
                    <p className="text-xs truncate" style={{ color: textMuted }}>
                      {user.email}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2"
                  style={{
                    borderColor: borderColor,
                    color: textColor,
                    background: 'transparent'
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => base44.auth.redirectToLogin(location.pathname)}
                className="w-full font-semibold"
                style={{
                  background: secondaryColor,
                  color: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(176, 137, 104, 0.2)'
                }}
              >
                Sign In
              </Button>
            )}
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col" style={{ background: bgColor }}>
          <header 
            className="px-6 py-4 lg:hidden sticky top-0 z-40"
            style={{ 
              borderBottom: `1px solid ${borderColor}`,
              background: surfaceColor,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}
          >
            <div className="flex items-center gap-4">
              <SidebarTrigger className="p-2 rounded-xl" style={{ color: textColor }} />
              <div className="flex items-center gap-2">
                <Gavel className="w-5 h-5" style={{ color: secondaryColor }} />
                <h1 className="text-lg font-semibold" style={{ color: textColor }}>UniMarket</h1>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
