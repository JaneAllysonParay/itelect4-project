import { Link, useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";
import SectionCard from "@/components/SectionCard";
import FieldLabel from "@/components/FieldLabel";
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
      setSession(reply.token, reply.user.id, reply.user.name, reply.user.role);
      navigate("/claims");
    },
  });

  return (
    <div className="mx-auto w-full max-w-lg">
      <PageHeader title="Create your account" description="Use your campus details to report property, submit ownership proof privately, and follow your Claim history." eyebrow="Campus account" className="mb-5" />
      <SectionCard title="Student account details" description="Your account is created with the role assigned by the existing registration service.">
        <form onSubmit={handleSubmit((values) => signUp.mutate(values))} className="grid min-w-0 gap-5" aria-busy={signUp.isPending}>
          <div className="grid min-w-0 gap-2">
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input id="name" autoComplete="name" {...register("name")} aria-required="true" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} />
            {errors.name && <p id="name-error" className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid min-w-0 gap-2">
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input id="email" type="email" autoComplete="email" {...register("email")} aria-required="true" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} />
            {errors.email && <p id="email-error" className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="grid min-w-0 gap-2">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input id="password" type="password" autoComplete="new-password" {...register("password")} aria-required="true" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-help password-error" : "password-help"} />
            <p id="password-help" className="text-sm text-muted-foreground">Use at least 8 characters.</p>
            {errors.password && <p id="password-error" className="text-sm text-destructive">{errors.password.message}</p>}
          </div>

          {signUp.isError && <p role="alert" className="break-words rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">We couldn’t create your account. {signUp.error.message}</p>}

          <Button type="submit" disabled={signUp.isPending} className="w-full sm:w-auto sm:justify-self-start">
            {signUp.isPending ? "Creating account..." : "Create account"}
          </Button>
        </form>
      </SectionCard>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have an account? <Link className="font-medium text-primary underline underline-offset-4" to="/login">Sign in</Link>
      </p>
    </div>
  );
}

export default RegisterPage;
