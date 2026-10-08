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

printf "Comenta 1.0 — instalador legado (base Whaticket/Atendechat)\n"
printf "Não instala o Comenta 1.0 deste monorepo; o caminho oficial é deploy/bootstrap.sh\n"



  printf "${NC}";

  printf "\n"
}
