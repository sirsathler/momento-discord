import { Client, Message, TextChannel } from "discord.js";
import { MomentoComment } from "../Classes/MomentoComment";
import { MomentoPost } from "../Classes/MomentoPost";
import { MomentoServer } from "../Classes/MomentoServer";
import * as config from "../config.json";
import { MongoService } from "../Services/MongoService";
import { ServerServices } from "../Services/ServerServices";
import { UserServices } from "../Services/UserServices";
import { sendErrorMessage, sendReplyMessage, tryDeleteMessage } from "../Utils/MomentoMessages";

export async function messageCreate(message: Message, client: Client) {
    if (message.author.bot) return;
    const momentoUser = await MongoService.getUserById(message.author.id, message.guild.id);
    const channel: TextChannel = message.channel as TextChannel
    const serverConfig: MomentoServer = await MongoService.getServerConfigById(channel.guildId)


    const isCommand = message.content.charAt(0) == config.prefix ? true : false;
    const isProfileCommand = momentoUser && momentoUser.profileChannelId == message.channel.id
        && momentoUser.guildId == channel.guildId ? true : false;

    const isSomeoneProfileChannel: Boolean = await MongoService.getUserByProfileChannel(String(message.channelId), message.guildId) ? true : false

    let isComment: Boolean = false;

    if (!isSomeoneProfileChannel) {
        const messageChannel = message.guild.channels.cache.get(message.channelId)
        isComment = await MongoService.getUserByProfileChannel(String(messageChannel.parentId), message.guildId) ? true : false
    }

    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    let reply: Message
    try {
        if (isCommand) {
            if (!serverConfig && command != "configurar") { throw new Error("Servidor não configurado! Use ?configurar para iniciarmos!") }
            if (isProfileCommand) {
                if (command.slice(0, -1) == 'collage') {
                    reply = await message.reply("Alterando sua foto de collage, aguarde...")
                    const collageNumber: Number = Number(command.charAt(7)) - 1
                    await UserServices.changeProfileCollage(message, momentoUser, collageNumber)
                    if (reply) { tryDeleteMessage(reply) }
                    tryDeleteMessage(message)
                    return
                }

                switch (command) {
                    case "perfil":
                        reply = await message.reply("Alterando sua foto de perfil, aguarde...")
                        await UserServices.changeProfilePicture(message, momentoUser)
                        break
                    case "capa":
                        reply = await message.reply("Alterando sua foto de capa, aguarde...")
                        await UserServices.changeProfileCover(message, momentoUser)
                        if (reply) { tryDeleteMessage(reply) }
                        break
                    case "user":
                        reply = await message.reply("Alterando seu usuário, aguarde...")
                        await UserServices.changeProfileUser(message, momentoUser, args)
                        if (reply) { tryDeleteMessage(reply) }
                        break
                    case "nome":
                        reply = await message.reply("Alterando seu nome, aguarde...")
                        await UserServices.changeProfileName(message, momentoUser, args)
                        if (reply) { tryDeleteMessage(reply) }
                        break
                    case "bio":
                        reply = await message.reply("Alterando sua bio, aguarde...")
                        await UserServices.changeProfileBio(message, momentoUser, args)
                        if (reply) { tryDeleteMessage(reply) }
                        break
                }

                tryDeleteMessage(message)
                return
            }

            switch (command) {
                case "configurar":
                    reply = await message.reply("Configurando servidor, aguarde...")
                    await ServerServices.createServerConfig(message)
                    if (reply) { tryDeleteMessage(reply) }
                    break
                case "pedirperfil":
                    if (channel.id == serverConfig.askProfileChannelId) {
                        reply = await message.reply("Criando seu perfil, aguarde...")
                        await UserServices.askProfile(message)
                        if (reply) { tryDeleteMessage(reply) }
                        break
                    }
                    break
                default:
                    sendErrorMessage(message, "Comando não encontrado!")
                    break
            }
            tryDeleteMessage(message)
            return
        }
        else {
            if (isComment) {
                await MomentoComment.createComment(message)
                if (reply) { tryDeleteMessage(reply) }
                return
            }
            reply = await message.reply("Criando seu post, aguarde...")
            await MomentoPost.createPost(client, message, null)
            if (reply) { tryDeleteMessage(reply) }
            tryDeleteMessage(message)
        }
    }
    catch (err) {
        tryDeleteMessage(reply)
        sendErrorMessage(message, err.message)
        console.log(err)
        return
    }
}