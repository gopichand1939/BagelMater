import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import heroImage from "../../assets/cafeimageLoginpage.png";
import { ADMIN_LOGIN } from "../../Utils/Constant";
import { getFirstAccessibleRoute, setAuthSession } from "../../Utils/authStorage";
import { Button, Card, InputField } from "../../components/ui";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Email and password are required");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(ADMIN_LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Login failed");
      }

      setAuthSession({
        accessToken: data?.data?.access_token,
        refreshToken: data?.data?.refresh_token,
        admin: data?.data?.admin,
        menuArray: data?.data?.menu_array,
        persist: true,
      });

      toast.success("Login successful");
      navigate(getFirstAccessibleRoute(data?.data?.menu_array || []), { replace: true });
    } catch (error) {
      setErrorMessage(error.message || "Login failed");
      toast.error(error.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ui-auth-shell grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-stone-950 lg:block">
        <img
          src={heroImage}
          alt="Cafe"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/70" />

        <div className="absolute bottom-10 left-10 right-10 max-w-lg space-y-3 text-orange-50">
          <p className="text-xs font-bold uppercase tracking-widest">Cafe Admin</p>
          <h1 className="text-5xl font-bold leading-tight">Welcome back</h1>
          <p className="text-sm opacity-90">
            Log in to manage categories, menu items, and the full restaurant dashboard.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-10">
        <Card
          as="form"
          onSubmit={handleSubmit}
          className="w-full max-w-md space-y-4"
          padding="lg"
        >
          <div className="space-y-1 text-orange-900">
            <p className="text-xs font-bold uppercase tracking-widest">Admin Access</p>
            <h2 className="text-3xl font-bold text-text-strong">Login</h2>
            <p className="text-sm text-text-muted">Use your admin email and password to continue.</p>
          </div>

          <InputField
            type="text"
            name="cafe_admin_email"
            placeholder="Email"
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <InputField
            type="password"
            name="cafe_admin_password"
            placeholder="Password"
            autoComplete="off"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {errorMessage ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {errorMessage}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={isSubmitting}
            size="lg"
            className="w-full"
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </Button>

          <p className="text-sm text-text-base">
            Need to create the first admin?{" "}
            <button
              type="button"
              onClick={() => navigate("/register")}
              className="font-bold text-brand-700"
            >
              Register
            </button>
          </p>
        </Card>
      </div>
    </div>
  );
}

export default Login;
