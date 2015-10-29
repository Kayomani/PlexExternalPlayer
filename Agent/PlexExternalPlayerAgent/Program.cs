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

                    context.Response = HttpResponse.CreateWithMessage(HttpResponseCode.Ok, "Received", false);

                    var info = new ProcessStartInfo();
                    info.FileName = Encoding.UTF8.GetString(Convert.FromBase64String(context.Request.Uri.OriginalString.Substring(1)));
                    info.UseShellExecute = true;

                    if (File.Exists(info.FileName))
                    {
                        var fn = info.FileName.ToLower();
                        if (fn.EndsWith(".avi") ||
                            fn.EndsWith(".mkv") ||
                            fn.EndsWith(".mp4") ||
                            fn.EndsWith(".mpg") ||
                            fn.EndsWith(".mpeg"))
                        {
                            Process.Start(info);
                        }
                        else
                        {
                            MessageBox.Show("Tried to run " + info.FileName + " but it wasn't allowed.");
                        }

                    }
                    else
                    {
                        MessageBox.Show("Tried to run " + info.FileName + " but it didn't exist.");
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
