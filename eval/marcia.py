import random
import string

secretNum = "".join(random.choices(string.digits, k=4))

user_input = None
lances = []
num_jogadas = 0

while user_input != "q":
    user_input = input("Por favor escreve o teu comando: ")
    user_guess = ""
    if user_input == "a":
        print("Selecionaste o comando: a")
        while len(user_guess) != 4 or not user_guess.isdigit():
            user_guess = input("Adivinha o numero secreto: ")
            if not user_guess.isdigit():
                print("O teu palpite tem de ser um numero!")
            elif len(user_guess) != 4:
                print("O teu palpite tem de ter 4 digitos!")
            else:
                num_jogadas = num_jogadas + 1
                lances.append(user_guess)
                if user_guess != secretNum:
                    indexes_corretos = []
                    for index, character in enumerate(user_guess):
                        if character == secretNum[index]:
                            indexes_corretos.append(index)
                    print("Os numeros nas posiçoes: ",
                          indexes_corretos, " estao corretos!")
                else:
                    print("Parabens! Acertaste o numero em ",
                          num_jogadas, " jogadas")
                    exit(0)
    elif user_input == "b":
        print("Numero total de jogadas: ", num_jogadas)
        print("Os seus palpites: ")
        for index, palpite in enumerate(lances):
            print("Palpite ", index+1, ":", palpite)

print("Desisiste! Obrigado por jogar!")
print("Fizeste um total de ", num_jogadas, " palpites")
print("O numero secreto era: ", secretNum)
