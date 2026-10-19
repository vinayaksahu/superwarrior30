import "dotenv/config";
import pg from "pg";

const { Client } = pg;

async function fix() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error("No DB url found");
    return;
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  console.log("Connected to DB. Fixing permissions and menu visibility...");

  // 1. Update member_portal_menu_config
  const menuRes = await client.query(`SELECT value FROM site_settings WHERE key = 'member_portal_menu_config'`);
  if (menuRes.rows.length > 0) {
    try {
      const config = JSON.parse(menuRes.rows[0].value);
      if (Array.isArray(config)) {
        const hasCopy = config.some((item: any) => item.key === "copy_trading");
        if (!hasCopy) {
          config.splice(2, 0, { key: "copy_trading", isEnabled: true });
          await client.query(`UPDATE site_settings SET value = $1 WHERE key = 'member_portal_menu_config'`, [
            JSON.stringify(config),
          ]);
          console.log("✅ Added copy_trading to member_portal_menu_config");
        } else {
          console.log("ℹ️ copy_trading already present in menu config");
        }
      }
    } catch (e) {
      console.error("Error parsing menu config:", e);
    }
  }

  // 2. Update Rahul's customPermissions to include copy_trading permissions
  const rahulRes = await client.query(`SELECT id, "customPermissions" FROM users WHERE email = 'rahultradeworrieracademy@gmail.com'`);
  if (rahulRes.rows.length > 0) {
    const user = rahulRes.rows[0];
    let perms: string[] = [];
    if (Array.isArray(user.customPermissions)) {
      perms = user.customPermissions;
    } else if (typeof user.customPermissions === "string") {
      try { perms = JSON.parse(user.customPermissions); } catch {}
    }

    const copyPerms = [
      "copy_trading.view",
      "copy_trading.manage",
      "copy_trading.approve",
      "copy_trading.settings"
    ];

    let changed = false;
    for (const p of copyPerms) {
      if (!perms.includes(p)) {
        perms.push(p);
        changed = true;
      }
    }

    if (changed) {
      await client.query(`UPDATE users SET "customPermissions" = $1 WHERE id = $2`, [
        JSON.stringify(perms),
        user.id,
      ]);
      console.log("✅ Added copy_trading permissions to rahultradeworrieracademy@gmail.com");
    } else {
      console.log("ℹ️ Rahul already has copy_trading permissions");
    }
  }

  await client.end();
  console.log("ALL_VISIBILITY_FIXES_APPLIED");
}

fix().catch(console.error);
