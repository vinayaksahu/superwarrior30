import { NextResponse } from "next/server";
import { getCurrentUser, isSuperAdminUser } from "@/server/dal/auth";
import { resolveCurrentEnvironment } from "@/lib/env-context";
import { switchEnvironmentAction } from "@/server/actions/environment.actions";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isSuperAdminUser(user)) {
    return NextResponse.json(
      { error: "Forbidden: Super Admin access required." },
      { status: 403 }
    );
  }

  const environment = await resolveCurrentEnvironment();
  return NextResponse.json({
    environment,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isSuperAdminUser(user)) {
    return NextResponse.json(
      { error: "Forbidden: Super Admin access required." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const targetEnv = body.targetEnv;

    if (targetEnv !== "LIVE" && targetEnv !== "TEST") {
      return NextResponse.json(
        { error: "Invalid targetEnv. Must be 'LIVE' or 'TEST'." },
        { status: 400 }
      );
    }

    const result = await switchEnvironmentAction(targetEnv);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      environment: result.environment,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
