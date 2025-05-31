const ContactProfileService = require("../services/ContactProfileService");

async function testContactProfile() {
  try {
    console.log("🧪 Testando atualização de perfil de contato...");

    // Exemplo de uso - substitua pelos dados reais
    const phone = "5511999999999"; // Número do contato
    const instanceName = "sua-instancia"; // Nome da sua instância

    console.log(`📞 Testando contato: ${phone}`);
    console.log(`🏢 Instância: ${instanceName}`);

    const result = await ContactProfileService.updateContactProfile(
      phone,
      instanceName
    );

    console.log("📊 Resultado:", JSON.stringify(result, null, 2));

    if (result.success) {
      if (result.updated) {
        console.log("✅ Perfil atualizado com sucesso!");
        console.log("👤 Nome:", result.data?.pushname || "Não encontrado");
        console.log("🖼️ Foto:", result.data?.profilePicUrl ? "Sim" : "Não");
      } else {
        console.log("ℹ️ Nenhuma atualização necessária");
      }
    } else {
      console.log("❌ Erro:", result.message);
    }
  } catch (error) {
    console.error("❌ Erro no teste:", error);
  }
}

async function testMultipleProfiles() {
  try {
    console.log("🧪 Testando atualização de múltiplos perfis...");

    // Exemplo de múltiplos contatos
    const contacts = [
      { phone: "5511999999999", instanceName: "sua-instancia" },
      { phone: "5511888888888", instanceName: "sua-instancia" },
      // Adicione mais contatos conforme necessário
    ];

    console.log(`📞 Testando ${contacts.length} contatos...`);

    const results = await ContactProfileService.updateMultipleContactProfiles(
      contacts
    );

    console.log("📊 Resultados:", JSON.stringify(results, null, 2));

    const successCount = results.filter((r) => r.success && r.updated).length;
    const errorCount = results.filter((r) => !r.success).length;

    console.log(`✅ Sucessos: ${successCount}`);
    console.log(`❌ Erros: ${errorCount}`);
  } catch (error) {
    console.error("❌ Erro no teste:", error);
  }
}

// Executar testes
async function runTests() {
  console.log("🚀 Iniciando testes do ContactProfileService...\n");

  await testContactProfile();
  console.log("\n" + "=".repeat(50) + "\n");
  await testMultipleProfiles();

  console.log("\n✅ Testes concluídos!");
}

// Executar se chamado diretamente
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testContactProfile,
  testMultipleProfiles,
  runTests,
};
