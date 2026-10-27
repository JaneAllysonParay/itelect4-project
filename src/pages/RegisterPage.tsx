import { Link, useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginUser, registerUser } from "../api/client";
import { registerSchema, type RegisterFormValues } from "../schemas/authSchema";
import useAuthStore from "../store/authStore";

function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    defaultValues: { name: "", email: "", password: "" },
  });

  const signUp = useMutation({
    mutationFn: async (values: RegisterFormValues) => {
      await registerUser(values);
      return loginUser({ email: values.email, password: values.password });
    },
    onSuccess: (reply) => {
      setSession(reply.token, reply.user.id, reply.user.name);
      navigate("/claims");
    },
  });

  return (
    <div className="max-w-sm">
      <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
        Register
      </h2>

      <form
        onSubmit={handleSubmit((values) => signUp.mutate(values))}
        className="grid gap-4"
      >
        <div className="grid gap-1.5">
          <Label htmlFor="name" className="text-foreground">
            Name
          </Label>
          <Input
            id="name"
            autoComplete="name"
            {...register("name")}
            aria-invalid={errors.name ? true : undefined}
          />
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="email" className="text-foreground">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            {...register("email")}
            aria-invalid={errors.email ? true : undefined}
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="password" className="text-foreground">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register("password")}
            aria-invalid={errors.password ? true : undefined}
          />
          {errors.password && (
            <p className="text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        {signUp.isError && (
          <p className="text-sm text-red-700">{signUp.error.message}</p>
        )}

        <Button type="submit" disabled={signUp.isPending}>
          {signUp.isPending ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
        Already have an account? <Link className="text-blue-600 underline" to="/login">Login</Link>
      </p>
    </div>
  );
}

export default RegisterPage;
