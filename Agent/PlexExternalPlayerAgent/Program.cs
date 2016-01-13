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

            using (var httpServer = new HttpServer(new HttpRequestProvider()))
            {
                httpServer.Use(new TcpListenerAdapter(new TcpListener(IPAddress.Loopback, 7251)));
                httpServer.Use((context, next) =>
                {
                    Console.WriteLine("Got Request!");

                    var expectedProtocol = "1";
                    var protocol = context.Request.QueryString.GetByName("protocol");

                    if (protocol != "1")
                    {
                        MessageBox.Show($"Agent and script version differ.  Agent: {expectedProtocol}  Script : {protocol}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                        return Task.Factory.GetCompleted();
                    }

                    context.Response = HttpResponse.CreateWithMessage(HttpResponseCode.Ok, "Received", false);

                    var info = new ProcessStartInfo();
                    info.FileName = WebUtility.UrlDecode(context.Request.QueryString.GetByName("item"));
                    info.UseShellExecute = true;

                    if (File.Exists(info.FileName))
                    {
                        var fn = info.FileName.ToLower();
                        if (fn.EndsWith(".avi") ||
                            fn.EndsWith(".mkv") ||
                            fn.EndsWith(".mp4") ||
                            fn.EndsWith(".mpg") ||
                            fn.EndsWith(".ts") ||
                            fn.EndsWith(".mpeg"))
                        {
                            try {
                                Process.Start(info);
                            }
                            catch(Exception e)
                            {
                                MessageBox.Show($"Error running {info.FileName}  due to : {e.Message}","Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                            }
                        }
                        else
                        {
                            MessageBox.Show($"Tried to run {info.FileName} but it wasn't allowed.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                        }

                    } else if (Directory.Exists(info.FileName))
                    {
                        try {
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
