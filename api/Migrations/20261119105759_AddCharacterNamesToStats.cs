using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class AddCharacterNamesToStats : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CharacterName",
                table: "CharacterStats",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ShowName",
                table: "CharacterStats",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_CharacterStats_CharacterId",
                table: "CharacterStats",
                column: "CharacterId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_CharacterStats_CharacterId",
                table: "CharacterStats");

            migrationBuilder.DropColumn(
                name: "CharacterName",
                table: "CharacterStats");

            migrationBuilder.DropColumn(
                name: "ShowName",
                table: "CharacterStats");
        }
    }
}
