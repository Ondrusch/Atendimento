const sqlite3 = require("sqlite3").verbose();

// Conectar ao banco de dados
const db = new sqlite3.Database("./database.sqlite");

console.log("🔧 Corrigindo nomes dos usuários...");

// Verificar usuários com nomes que são textos de função
const roleTexts = ["Administrador", "Supervisor", "Atendente"];

db.serialize(() => {
  console.log("\n📊 USUÁRIOS ATUAIS:");

  db.all("SELECT id, name, email, role FROM users", (err, rows) => {
    if (err) {
      console.error("❌ Erro ao buscar usuários:", err);
      return;
    }

    console.log("ID | Nome | Email | Role");
    console.log("---|------|-------|------");

    rows.forEach((user) => {
      const hasRoleAsName = roleTexts.includes(user.name);
      const indicator = hasRoleAsName ? "⚠️" : "✅";
      console.log(
        `${indicator} ${user.id.slice(0, 8)}... | ${user.name} | ${
          user.email
        } | ${user.role}`
      );
    });

    // Perguntar se quer corrigir automaticamente
    console.log("\n🤔 Usuários com nomes de função detectados.");
    console.log(
      "Deseja executar correção automática? (modifique o script se necessário)"
    );
    console.log("\n💡 Sugestões de correção:");

    rows.forEach((user) => {
      if (roleTexts.includes(user.name)) {
        let suggestedName = "";

        // Extrair nome do email se possível
        const emailName = user.email.split("@")[0];
        if (emailName && emailName !== "admin") {
          // Converter email para nome (ex: bruno.silva -> Bruno Silva)
          suggestedName = emailName
            .split(".")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ");
        } else {
          // Nomes padrão baseados na função
          const defaultNames = {
            admin: "Administrador do Sistema",
            supervisor: "Supervisor Geral",
            atendente: "Atendente Padrão",
          };
          suggestedName = defaultNames[user.role] || "Usuário";
        }

        console.log(`   ${user.email} -> "${suggestedName}"`);
      }
    });

    console.log("\n🔧 Para aplicar as correções, descomente as linhas abaixo:");
    console.log("// Executar correções automáticas");

    // DESCOMENTE AS LINHAS ABAIXO PARA EXECUTAR AS CORREÇÕES
    /*
    rows.forEach(user => {
      if (roleTexts.includes(user.name)) {
        let newName = '';
        
        const emailName = user.email.split('@')[0];
        if (emailName && emailName !== 'admin') {
          newName = emailName
            .split('.')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
        } else {
          const defaultNames = {
            'admin': 'Administrador do Sistema',
            'supervisor': 'Supervisor Geral', 
            'atendente': 'Atendente Padrão'
          };
          newName = defaultNames[user.role] || 'Usuário';
        }
        
        db.run(
          "UPDATE users SET name = ? WHERE id = ?",
          [newName, user.id],
          function(err) {
            if (err) {
              console.error(`❌ Erro ao atualizar ${user.email}:`, err);
            } else {
              console.log(`✅ ${user.email}: "${user.name}" -> "${newName}"`);
            }
          }
        );
      }
    });
    */

    db.close();
  });
});
