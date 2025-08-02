const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { Manager } = require('erela.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const prefix = "??";
let is247 = false;

client.manager = new Manager({
    nodes: [
        {
            host: "localhost",
            port: 2333,
            password: "youshallnotpass",
        },
    ],
    send(id, payload) {
        const guild = client.guilds.cache.get(id);
        if (guild) guild.shard.send(payload);
    },
})
.on("nodeConnect", node => console.log(`Node "${node.options.identifier}" connected.`))
.on("nodeError", (node, error) => console.log(`Node error: ${error.message}`))
.on("trackStart", (player, track) => {
    const channel = client.channels.cache.get(player.textChannel);
    if (channel) channel.send(`🎶 Now playing: **${track.title}**`);
})
.on("queueEnd", player => {
    const channel = client.channels.cache.get(player.textChannel);
    if (channel) channel.send("Queue has ended.");
    if (!is247) player.destroy();
});

client.once("ready", () => {
    console.log(`${client.user.tag} is online!`);
    client.manager.init(client.user.id);
});

client.on("raw", d => client.manager.updateVoiceState(d));

client.on("messageCreate", async message => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const cmd = args.shift().toLowerCase();

    // Help Command
    if (cmd === "help") {
        const homeEmbed = new EmbedBuilder().setTitle('📜 Help Menu - Home').setDescription('Select a category below').setColor('#00AAFF');
        const musicEmbed = new EmbedBuilder().setTitle('🎵 Music Commands').setDescription('`play`, `stop`, `skip`, `pause`, `resume`, `queue`, `np`, `247`, `join`, `leave`').setColor('#FF69B4');

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help-menu')
            .setPlaceholder('Select a category')
            .addOptions([
                { label: 'Home', value: 'home', emoji: '🏠' },
                { label: 'Music', value: 'music', emoji: '🎵' },
                { label: 'Utility', value: 'utility', emoji: '🛠' },
                { label: 'Reminder', value: 'reminder', emoji: '⏰' },
                { label: 'Spotify', value: 'spotify', emoji: '🎧' },
                { label: 'Games', value: 'games', emoji: '🎮' },
                { label: 'Playlist', value: 'playlist', emoji: '📂' },
                { label: 'Settings', value: 'settings', emoji: '⚙' }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);
        const msg = await message.reply({ embeds: [homeEmbed], components: [row] });

        const collector = msg.createMessageComponentCollector({ time: 60000 });
        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) return i.reply({ content: 'This menu is not for you!', ephemeral: true });
            let embed;
            switch (i.values[0]) {
                case 'music': embed = musicEmbed; break;
                default: embed = homeEmbed;
            }
            await i.update({ embeds: [embed], components: [row] });
        });
        return;
    }

    // Music Commands
    const voiceChannel = message.member.voice.channel;
    const player = client.manager.create({
        guild: message.guild.id,
        voiceChannel: voiceChannel?.id,
        textChannel: message.channel.id,
        selfDeaf: true
    });

    if (cmd === "play") {
        if (!voiceChannel) return message.reply("Join a voice channel first!");
        if (player.state !== "CONNECTED") player.connect();
        const search = args.join(" ");
        if (!search) return message.reply("Provide a song name or URL!");
        const res = await client.manager.search(search, message.author);
        if (res.loadType === "NO_MATCHES") return message.reply("No matches found.");
        player.queue.add(res.tracks[0]);
        if (!player.playing) player.play();
        return message.reply(`Added **${res.tracks[0].title}** to queue.`);
    }

    if (cmd === "skip") {
        if (!player.playing) return message.reply("No music is playing.");
        player.stop();
        return message.reply("Skipped current song.");
    }

    if (cmd === "stop") {
        player.destroy();
        return message.reply("Stopped the music and cleared the queue.");
    }

    if (cmd === "pause") {
        player.pause(true);
        return message.reply("Music paused.");
    }

    if (cmd === "resume") {
        player.pause(false);
        return message.reply("Music resumed.");
    }

    if (cmd === "np") {
        if (!player.playing) return message.reply("Nothing is playing.");
        const track = player.queue.current;
        return message.reply(`🎶 Now playing: **${track.title}**`);
    }

    if (cmd === "queue") {
        if (!player.queue.length) return message.reply("Queue is empty.");
        return message.reply("**Queue:**\n" + player.queue.map((t, i) => `${i+1}. ${t.title}`).join("\n"));
    }

    if (cmd === "247") {
        is247 = !is247;
        return message.reply(`24/7 mode is now **${is247 ? "enabled" : "disabled"}**.`);
    }

    if (cmd === "join") {
        if (!voiceChannel) return message.reply("Join a voice channel first!");
        if (player.state !== "CONNECTED") player.connect();
        return message.reply(`Joined ${voiceChannel.name}`);
    }

    if (cmd === "leave") {
        player.destroy();
        return message.reply("Left the voice channel.");
    }
});

client.login("YOUR_BOT_TOKEN");
