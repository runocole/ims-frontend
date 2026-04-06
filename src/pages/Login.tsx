import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import authHero from "@/assets/auth-hero.jpg";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import logo from "../assets/otic-logo.png";

const Login = () => {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || "Invalid credentials");
        return;
      }

      localStorage.setItem(ACCESS_TOKEN, data.access);
      localStorage.setItem(REFRESH_TOKEN, data.refresh);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("userRole", data.user.role);

      setTimeout(() => {
        const role = data.user.role;

        if (role === "admin") {
          navigate("/dashboard", { replace: true });
        } else if (role === "staff") {
          navigate("/staff/dashboard", { replace: true });
        } else if (role === "customer") {
          navigate("/customer/dashboard", { replace: true });
        } else {
          navigate("/login", { replace: true });
        }
      }, 100);
    } catch (err) {
      console.error("Login error:", err);
      alert("Something went wrong during login.");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-[#061024] via-[#0a1930] to-[#0c2148] overflow-hidden p-4">
      {/* Soft radial glow in the background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,115,255,0.08)_0%,transparent_70%)]" />

      {/* Main floating card */}
      <Card className="w-full max-w-6xl bg-[#0f1f3d]/95 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col lg:flex-row border border-[#1b2d55] relative z-10 backdrop-blur-md transform transition-all hover:scale-[1.01] hover:shadow-[0_0_50px_rgba(0,115,255,0.3)]">

        {/* Left side hero */}
        <div className="lg:w-1/2 relative bg-gradient-to-br from-[#13274b] to-[#1b2d55] shadow-inner shadow-[inset_0_0_25px_rgba(0,0,0,0.6)]">
          <img
            src={authHero}
            alt="Authentication"
            className="w-full h-64 lg:h-full object-cover opacity-50 mix-blend-overlay"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-6 bg-gradient-to-b from-transparent via-[#0a1836]/40 to-[#0a1836]/80">
            <div className="space-y-3">
              <p className="text-3xl lg:text-4xl font-semibold text-blue-100 animate-fadeInLine1 drop-shadow-[0_0_10px_rgba(0,115,255,0.5)]">
                Manage your inventory.
              </p>
              <p className="text-3xl lg:text-4xl font-semibold text-blue-200 animate-fadeInLine2 drop-shadow-[0_0_10px_rgba(0,115,255,0.4)]">
                Track your sales.
              </p>
              <p className="text-3xl lg:text-4xl font-semibold text-blue-300 animate-fadeInLine3 drop-shadow-[0_0_15px_rgba(0,115,255,0.4)]">
                Stay in control.
              </p>
            </div>
          </div>
        </div>

        {/* Right side form */}
        <div className="lg:w-1/2 p-8 lg:p-12 text-white relative z-20 shadow-[0_0_30px_rgba(0,115,255,0.15)]">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="p-3 bg-[#18356c] rounded-xl shadow-md">
              <img src={logo} alt="OTIC Logo" className="h-8 w-8 object-contain" />
            </div>
            <h2 className="text-2xl font-bold text-blue-200 tracking-tight">
              OTIC GEOSYSTEMS
            </h2>
          </div>

          <div className="w-full">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-semibold text-blue-100">Sign In</h2>
                <p className="text-blue-300 text-sm">
                  Enter your credentials to access your account
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-blue-200">Email</Label>
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-11 bg-[#162a52] border border-[#2a4375] text-white placeholder:text-blue-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-blue-200">Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11 bg-[#162a52] border border-[#2a4375] text-white placeholder:text-blue-200 focus:ring-2 focus:ring-blue-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      disabled={isLoading}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-300 hover:text-blue-100 transition-colors disabled:opacity-50"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-lg shadow-blue-500/30"
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Sign In"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Login;