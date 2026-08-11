#!/bin/bash
#
# Print banner art.

#######################################
# Print a board.
# Globals:
#   BG_BROWN
#   NC
#   WHITE
#   CYAN_LIGHT
#   RED
#   GREEN
#   YELLOW
# Arguments:
#   None
#######################################
print_banner() {
  clear


printf "${GREEN}";
printf " #####    ######   ##   ##   ######   ##  ##   ######   ######\n";
printf "##   ##   ##  ##   ### ###   ##       ### ##     ##     ##  ##\n";
printf "##        ##  ##   #######   ####     ######     ##     ######\n";
printf "##        ##  ##   ## # ##   ##       ## ###     ##     ##  ##\n";
printf "##   ##   ##  ##   ##   ##   ##       ##  ##     ##     ##  ##\n";
printf " #####    ######   ##   ##   ######   ##  ##     ##     ##  ##\n";

printf "\n"

printf "Comenta — Plataforma de Atendimento via WhatsApp\n"
printf "2026 @ Projeto Comenta\n"



  printf "${NC}";

  printf "\n"
}
