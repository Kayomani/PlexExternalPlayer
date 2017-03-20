using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using uhttpsharp;
using uhttpsharp.Listeners;
using uhttpsharp.RequestProviders;

namespace PlexExternalPlayerAgent
{
    static class Program
    {
        /// <summary>
        /// The main entry point for the application.
        /// </summary>
        [STAThread]
        static void Main()
        {
            var allowedExtensions = new List<string>()
            {
               ".avi",
               ".mkv",
               ".mp4",
               ".mpg",
               ".ts",
               ".wmv",
               ".m4v",
               ".flv",
               ".mpeg"
            };

            var configPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "PlexAgent\\allowed.json");

            try
            {
                if (File.Exists(configPath))
                {
                    allowedExtensions = JsonConvert.DeserializeObject<List<string>>(File.ReadAllText(configPath));
                }

            }
            catch
            {
                MessageBox.Show($"Failed to load extension preferences, switching back to defaults.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }

            using (var httpServer = new HttpServer(new HttpRequestProvider()))
            {
                try
                {
                    httpServer.Use(new TcpListenerAdapter(new TcpListener(IPAddress.Loopback, 7251)));
                }
                catch (Exception)
                {
                    MessageBox.Show($"Could not initilize server (Is another agent already runnning?). Cannot continue, closing agent.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    Environment.Exit(1);
                }

                httpServer.Use((context, next) =>
                {
                    Console.WriteLine("Got Request!");

                    var expectedProtocol = "1";
                    var protocol = context.Request.QueryString.GetByName("protocol");

                    if (protocol != "2")
                    {
                        MessageBox.Show($"Agent and script version differ.  Agent: {expectedProtocol}  Script : {protocol}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                        return Task.Factory.GetCompleted();
                    }

                    context.Response = HttpResponse.CreateWithMessage(HttpResponseCode.Ok, "Received", false);

                    var info = new ProcessStartInfo();
                    info.FileName = WebUtility.UrlDecode(context.Request.QueryString.GetByName("item")).Replace("[PLEXEXTPLUS]", "+");

                    info.UseShellExecute = true;

                    if (File.Exists(info.FileName))
                    {

                        var fn = info.FileName.ToLower();
                        var ext = Path.GetExtension(fn);

                        if (allowedExtensions.Contains(ext))
                        {
                            try
                            {
                                Process.Start(info);
                            }
                            catch (Exception e)
                            {
                                MessageBox.Show($"Error running {info.FileName}  due to : {e.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                            }
                        }
                        else
                        {

                            if (MessageBox.Show($"Tried to run {info.FileName} but {ext} files are not allowed. Do you want to open it anyway?", "Error", MessageBoxButtons.YesNo, MessageBoxIcon.Error) == DialogResult.Yes)
                            {

                                if (MessageBox.Show($"Do you want to whitelist {ext} files so you are not prompted in future?", "Error", MessageBoxButtons.YesNo, MessageBoxIcon.Error) == DialogResult.Yes)
                                {
                                    allowedExtensions.Add(ext);

                                    if (!Directory.Exists(Path.GetDirectoryName(configPath)))
                                        Directory.CreateDirectory(Path.GetDirectoryName(configPath));
                                    File.WriteAllText(configPath, JsonConvert.SerializeObject(allowedExtensions));
                                }

                                Process.Start(info);
                            }
                        }

                    }
                    else if (Directory.Exists(info.FileName))
                    {
                        try
                        {
                            Process.Start(info);
                        }
                        catch (Exception e)
                        {
                            MessageBox.Show($"Error running {info.FileName}  due to : {e.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                        }
                    }
                    else
                    {
                        MessageBox.Show($"Tried to run {info.FileName} but it didn't exist.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    }

                    return Task.Factory.GetCompleted();
                });

                httpServer.Start();

                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new Form1());
            }
        }
    }
}
