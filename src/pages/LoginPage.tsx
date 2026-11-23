import { Link, useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useAuthStore from "../store/authStore";
import { loginUser } from "../api/client";
import { loginSchema, type LoginFormValues } from "../schemas/authSchema";

import PageHeader from "@/components/PageHeader";
import SectionCard from "@/components/SectionCard";
import FieldLabel from "@/components/FieldLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "" },
  });

  const logIn = useMutation({
    mutationFn: loginUser,
    onSuccess: (reply) => {
      setSession(reply.token, reply.user.id, reply.user.name, reply.user.role);
      navigate("/claims");
    },
  });

  return (
    <div className="mx-auto w-full max-w-lg">
      <PageHeader title="Login" description="Sign in to submit a Claim, manage your reports, and track staff decisions." eyebrow="Campus account" className="mb-5" />
      <SectionCard title="Sign in to your account" description="Use the email address and password associated with your campus account.">
        <form onSubmit={handleSubmit((values) => logIn.mutate(values))} className="grid min-w-0 gap-5" aria-busy={logIn.isPending}>
          <div className="grid min-w-0 gap-2">
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input id="email" type="email" autoComplete="email" {...register("email")} aria-required="true" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} />
            {errors.email && <p id="email-error" className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="grid min-w-0 gap-2">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input id="password" type="password" autoComplete="current-password" {...register("password")} aria-required="true" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-error" : undefined} />
            {errors.password && <p id="password-error" className="text-sm text-destructive">{errors.password.message}</p>}
          </div>

          {logIn.isError && <p role="alert" className="break-words rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">We couldn’t sign you in. {logIn.error.message}</p>}

          <Button type="submit" disabled={logIn.isPending} className="w-full sm:w-auto sm:justify-self-start">
            {logIn.isPending ? "Signing in..." : "Log In"}
          </Button>
        </form>
      </SectionCard>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        New to Campus Lost &amp; Found? <Link className="font-medium text-primary underline underline-offset-4" to="/register">Create an account</Link>
      </p>
    </div>
  );
}

export default LoginPage;
